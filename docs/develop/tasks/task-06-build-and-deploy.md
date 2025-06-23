# Task 06: ビルドとデプロイ設定

## 概要
プロダクション環境でのビルドとデプロイ設定を行い、ローカルネットワーク内でのセルフホスティングを可能にする。

## 前提条件
- Task 05（E2Eテスト）が完了していること
- すべてのテストが正常に通ること

## 作業内容

### 1. プロダクションビルド設定
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          excalidraw: ['@excalidraw/excalidraw']
        }
      }
    }
  },
  server: {
    host: true, // ローカルネットワーク内でのアクセスを許可
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  }
});
```

### 2. 環境設定ファイル
```bash
# frontend/.env.production
VITE_WEBSOCKET_URL=ws://localhost:3002
VITE_APP_NAME=Excalidraw Board
VITE_APP_VERSION=1.0.0
```

```bash
# frontend/.env.local.example
VITE_WEBSOCKET_URL=ws://your-server-ip:3002
VITE_APP_NAME=Excalidraw Board
VITE_APP_VERSION=1.0.0
```

### 3. Docker Compose設定の改善
```yaml
# backend/docker-compose.yml
version: '3.8'

services:
  excalidraw-room:
    image: excalidraw/excalidraw-room:latest
    ports:
      - "3002:80"
    environment:
      - PORT=80
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ../frontend/dist:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - excalidraw-room
    restart: unless-stopped

volumes:
  logs:
```

### 4. Nginx設定
```nginx
# backend/nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    upstream excalidraw_room {
        server excalidraw-room:80;
    }

    server {
        listen 80;
        server_name localhost;

        # フロントエンドの静的ファイル
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # WebSocketプロキシ
        location /ws {
            proxy_pass http://excalidraw_room;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API プロキシ
        location /api {
            proxy_pass http://excalidraw_room;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 5. ビルドスクリプト
```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "Building Excalidraw Board..."

# フロントエンドのビルド
echo "Building frontend..."
cd frontend
npm run typecheck
npm run lint
npm run build

# テストの実行
echo "Running tests..."
npm test -- --coverage

# E2Eテストの実行
echo "Running E2E tests..."
cd ../playwright
npm test

echo "Build completed successfully!"
```

### 6. デプロイスクリプト
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Deploying Excalidraw Board..."

# 環境変数の確認
if [ -z "$DEPLOY_HOST" ]; then
    echo "Error: DEPLOY_HOST environment variable is not set"
    exit 1
fi

# ビルドの実行
./scripts/build.sh

# バックエンドの起動
echo "Starting backend services..."
cd backend
docker-compose down
docker-compose up -d

# ヘルスチェック
echo "Checking service health..."
sleep 10
curl -f http://localhost/health || exit 1

echo "Deployment completed successfully!"
echo "Frontend: http://$DEPLOY_HOST"
echo "Backend: http://$DEPLOY_HOST/api"
```

### 7. システムサービス設定
```ini
# scripts/excalidraw-board.service
[Unit]
Description=Excalidraw Board Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/excalidraw-board/backend
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### 8. モニタリング設定
```yaml
# backend/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
    restart: unless-stopped

volumes:
  grafana-storage:
```

### 9. バックアップスクリプト
```bash
#!/bin/bash
# scripts/backup.sh

set -e

BACKUP_DIR="/opt/excalidraw-board/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="excalidraw-board-backup-$DATE.tar.gz"

echo "Creating backup..."

# ディレクトリの作成
mkdir -p $BACKUP_DIR

# アプリケーションファイルのバックアップ
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    /opt/excalidraw-board/

echo "Backup created: $BACKUP_DIR/$BACKUP_FILE"

# 古いバックアップの削除（30日以上）
find $BACKUP_DIR -name "excalidraw-board-backup-*.tar.gz" -mtime +30 -delete

echo "Backup completed successfully!"
```

### 10. README.mdの作成
```markdown
# Excalidraw Board

ローカルネットワーク向けのExcalidrawリアルタイムコラボレーションシステム

## 特徴

- excalidrawベースのリアルタイム描画
- WebSocketによるリアルタイムコラボレーション
- ローカルネットワーク内でのセルフホスティング
- 10名以下の同時利用をサポート

## セットアップ

### 必要要件

- Node.js 18+
- Docker & Docker Compose
- npm

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd excalidraw-board

# 依存関係のインストール
cd frontend && npm install
cd ../playwright && npm install

# 環境変数の設定
cp frontend/.env.local.example frontend/.env.local
# VITE_WEBSOCKET_URLを適切に設定
```

### 開発環境の起動

```bash
# バックエンドの起動
cd backend
docker-compose up -d

# フロントエンドの起動
cd ../frontend
npm run dev
```

### プロダクション環境の起動

```bash
# ビルド
./scripts/build.sh

# デプロイ
./scripts/deploy.sh
```

## 使用方法

1. ブラウザで `http://localhost` にアクセス
2. Live Collaborationボタンをクリック
3. 他のユーザーと同じURLでアクセスして共同作業

## テスト

```bash
# 単体テスト
cd frontend && npm test

# E2Eテスト
cd playwright && npm test
```

## トラブルシューティング

### WebSocket接続エラー
- excalidraw-roomが起動していることを確認
- ファイアウォール設定を確認
- ポート3002が使用可能であることを確認

### コラボレーションが動作しない
- 両方のユーザーがコラボレーションを有効化していることを確認
- ネットワーク接続を確認
- ブラウザのコンソールでエラーをチェック
```

## 検証項目
- [ ] プロダクションビルドが正常に完了すること
- [ ] Dockerコンテナが正常に起動すること
- [ ] Nginxプロキシが正常に動作すること
- [ ] WebSocket接続が正常に動作すること
- [ ] ローカルネットワーク内からアクセス可能なこと
- [ ] バックアップスクリプトが正常に動作すること

## 成果物
- frontend/vite.config.ts
- backend/docker-compose.yml
- backend/nginx.conf
- scripts/build.sh
- scripts/deploy.sh
- scripts/backup.sh
- README.md

## 完了後の状態
- ローカルネットワーク内でのセルフホスティングが可能
- プロダクション環境でのリアルタイムコラボレーションが動作
- 監視とバックアップが設定済み