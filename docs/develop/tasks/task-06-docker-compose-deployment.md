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
- [x] フロントエンドのDockerfile作成
- [x] docker-compose.yml設定完了
- [x] フロントエンドコンテナの正常起動
- [x] excalidraw-roomコンテナの正常起動
- [x] コンテナ間通信の確認
- [x] ブラウザからのアクセス確認（HTTP 200応答確認）
- [x] WebSocket接続の確認（ポート3002でHTTP 200応答確認）
- [x] ヘルスチェックの動作確認（excalidraw-room: healthy状態）

## 成果物
- [x] frontend/Dockerfile（ビルド時環境変数対応）
- [x] frontend/nginx.conf（適切なnginx設定構造）
- [x] docker-compose.yml（本番用設定）
- [x] docker-compose.dev.yml（開発用設定）
- [x] scripts/deploy-docker.sh（デプロイスクリプト）
- [x] docs/docker-compose-guide.md（運用ドキュメント）
- [x] .env（環境変数設定ファイル）

## 実装状況
### ✅ 正常動作確認済み
- フロントエンドのマルチステージビルド（node:18-alpine → nginx:alpine）
- ビルド時のWebSocket URL環境変数設定（ARG/ENV）
- nginx.confの適切な構造（events, http, serverブロック）
- docker-compose.ymlでのサービス連携設定（本番環境）
- docker-compose.dev.ymlでの開発環境設定（npm install自動実行）
- ヘルスチェック機能（excalidraw-room）
- デプロイスクリプトによる自動化

### 📝 技術的詳細
1. **マルチステージビルド**: フロントエンドのビルドステージと実行ステージを分離し、最終イメージサイズを削減
2. **環境変数管理**: ビルド時（ARG）と実行時（ENV）の環境変数を適切に管理
3. **ネットワーク設定**: docker-composeのカスタムネットワーク（excalidraw-network）でサービス間通信を隔離
4. **ヘルスチェック**: excalidraw-roomサービスの死活監視を実装

### 🚀 アクセス情報
- **本番環境フロントエンド**: http://localhost (nginx)
- **開発環境フロントエンド**: http://localhost:5173 (Vite)
- **WebSocketサーバー**: ws://localhost:3002
- **excalidraw-roomヘルスチェック**: http://localhost:3002

### 🔧 トラブルシューティング
- **開発環境エラー解決**: docker-compose.dev.ymlでnpm install自動実行により依存関係問題を解決
- **nginx設定修正**: 適切なevents/http/serverブロック構造に修正
- **ポート競合**: 既存のバックエンドサービス停止が必要

## 次のステップ
Task 07: 統合テストの実装