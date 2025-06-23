# Task 06: Docker Composeデプロイメント

## 概要
Docker Composeを使用したシンプルなデプロイメント設定を行い、フロントエンドとバックエンドを統合した環境を構築する。

## 前提条件
- Task 05（E2Eテスト）が完了していること
- すべてのテストが正常に通ること
- Dockerが利用可能であること

## 作業内容

### 1. フロントエンドのDockerfile作成
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 本番用イメージ
FROM nginx:alpine

# Nginxの設定
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. フロントエンド用Nginx設定
```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # gzip圧縮の有効化
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # キャッシュ設定
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. 統合Docker Compose設定
```yaml
# docker-compose.yml (プロジェクトルート)
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_WEBSOCKET_URL=ws://localhost:3002
    depends_on:
      - excalidraw-room
    networks:
      - excalidraw-network

  excalidraw-room:
    image: excalidraw/excalidraw-room:latest
    ports:
      - "3002:80"
    environment:
      - PORT=80
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - excalidraw-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  excalidraw-network:
    driver: bridge
```

### 4. 環境変数設定
```bash
# .env
# フロントエンド設定
FRONTEND_PORT=80

# バックエンド設定
WEBSOCKET_PORT=3002

# 共通設定
NODE_ENV=production
```

### 5. ビルド&デプロイスクリプト
```bash
#!/bin/bash
# scripts/deploy-docker.sh

set -e

echo "=== Excalidraw Board Docker Deployment ==="

# 環境チェック
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

# 既存のコンテナを停止
echo "Stopping existing containers..."
docker-compose down

# ビルドとデプロイ
echo "Building and starting containers..."
docker-compose up -d --build

# ヘルスチェック待機
echo "Waiting for services to be healthy..."
sleep 10

# ステータス確認
echo "Checking service status..."
docker-compose ps

# アクセス情報表示
echo ""
echo "=== Deployment Complete ==="
echo "Frontend: http://localhost"
echo "WebSocket: ws://localhost:3002"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
```

### 6. 開発用Docker Compose設定
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend-dev:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_WEBSOCKET_URL=ws://localhost:3002
    command: npm run dev -- --host
    depends_on:
      - excalidraw-room
    networks:
      - excalidraw-network

  excalidraw-room:
    image: excalidraw/excalidraw-room:latest
    ports:
      - "3002:80"
    environment:
      - PORT=80
    networks:
      - excalidraw-network

networks:
  excalidraw-network:
    driver: bridge
```

### 7. 簡易運用ドキュメント
```markdown
# Docker Compose 運用ガイド

## 起動方法

### 本番環境
```bash
./scripts/deploy-docker.sh
```

### 開発環境
```bash
docker-compose -f docker-compose.dev.yml up
```

## コマンド一覧

### ログ確認
```bash
# すべてのサービスのログ
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f frontend
docker-compose logs -f excalidraw-room
```

### サービス管理
```bash
# 状態確認
docker-compose ps

# 再起動
docker-compose restart

# 停止
docker-compose down

# 完全削除（ボリューム含む）
docker-compose down -v
```

### トラブルシューティング

#### ポート競合エラー
```bash
# 使用中のポートを確認
lsof -i :80
lsof -i :3002

# .envファイルでポートを変更
FRONTEND_PORT=8080
WEBSOCKET_PORT=3003
```

#### コンテナが起動しない
```bash
# 詳細ログを確認
docker-compose logs --tail=50

# イメージを再ビルド
docker-compose build --no-cache
```
```

## 検証項目
- [ ] フロントエンドのDockerfile作成
- [ ] docker-compose.yml設定完了
- [ ] フロントエンドコンテナの正常起動
- [ ] excalidraw-roomコンテナの正常起動
- [ ] コンテナ間通信の確認
- [ ] ブラウザからのアクセス確認
- [ ] WebSocket接続の確認
- [ ] ヘルスチェックの動作確認

## 成果物
- frontend/Dockerfile
- frontend/nginx.conf
- docker-compose.yml
- docker-compose.dev.yml
- scripts/deploy-docker.sh
- 運用ドキュメント

## 次のステップ
Task 07: 統合テストの実装