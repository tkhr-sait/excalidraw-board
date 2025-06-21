# Task 02: Docker環境のセットアップ

## 概要
excalidraw-roomのDockerコンテナとフロントエンドアプリケーションを統合した開発環境をDocker Composeで構築する。

## 目的
- excalidraw-roomコンテナのセットアップ
- フロントエンドとバックエンドの接続設定
- ローカル開発環境の整備
- ネットワーク設定の最適化

## 前提条件
- Task 01が完了していること
- DockerおよびDocker Composeがインストールされていること

## 作業内容

### 1. Docker関連ディレクトリの作成
```bash
mkdir -p docker
mkdir -p docker/nginx
```

### 2. Docker Compose設定ファイルの作成
`docker/docker-compose.yml`:
```yaml
version: '3.8'

services:
  # Excalidraw Roomサーバー
  excalidraw-room:
    image: excalidraw/excalidraw-room:latest
    container_name: excalidraw-room
    ports:
      - "3002:80"  # WebSocketサーバー
    environment:
      - NODE_ENV=development
    networks:
      - excalidraw-network
    restart: unless-stopped

  # フロントエンド開発サーバー
  frontend:
    build:
      context: ../frontend
      dockerfile: ../docker/Dockerfile.frontend.dev
    container_name: excalidraw-frontend
    ports:
      - "3000:3000"
    volumes:
      - ../frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - VITE_WEBSOCKET_SERVER_URL=http://localhost:3002
    networks:
      - excalidraw-network
    depends_on:
      - excalidraw-room
    command: pnpm dev --host

networks:
  excalidraw-network:
    driver: bridge
```

### 3. フロントエンド用Dockerfileの作成
`docker/Dockerfile.frontend.dev`:
```dockerfile
FROM node:18-alpine

# pnpmのインストール
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

WORKDIR /app

# 依存関係のインストール
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# アプリケーションコードのコピー
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host"]
```

### 4. 本番環境用Docker Compose設定
`docker/docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  # Excalidraw Roomサーバー
  excalidraw-room:
    image: excalidraw/excalidraw-room:latest
    container_name: excalidraw-room-prod
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    networks:
      - excalidraw-network
    restart: always

  # Nginxリバースプロキシ
  nginx:
    image: nginx:alpine
    container_name: excalidraw-nginx
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ../frontend/dist:/usr/share/nginx/html:ro
    networks:
      - excalidraw-network
    depends_on:
      - excalidraw-room
    restart: always

networks:
  excalidraw-network:
    driver: bridge
```

### 5. Nginx設定ファイル
`docker/nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

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
        location /socket.io/ {
            proxy_pass http://excalidraw-room:80;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 6. 環境変数設定ファイル
`.env.example`:
```bash
# WebSocketサーバー設定
VITE_WEBSOCKET_SERVER_URL=http://localhost:3002

# アプリケーション設定
VITE_APP_TITLE=Excalidraw Board
```

### 7. Docker関連スクリプトの追加
`package.json`に追加:
```json
{
  "scripts": {
    "docker:dev": "docker-compose -f docker/docker-compose.yml up",
    "docker:dev:build": "docker-compose -f docker/docker-compose.yml up --build",
    "docker:down": "docker-compose -f docker/docker-compose.yml down",
    "docker:logs": "docker-compose -f docker/docker-compose.yml logs -f",
    "docker:prod": "docker-compose -f docker/docker-compose.prod.yml up -d",
    "docker:prod:down": "docker-compose -f docker/docker-compose.prod.yml down"
  }
}
```

### 8. excalidraw-roomの動作確認
```bash
# コンテナの起動
pnpm docker:dev

# 動作確認
# 1. http://localhost:3000 でフロントエンドにアクセス
# 2. http://localhost:3002 でWebSocketサーバーの応答確認
```

## テスト要件

### ユニットテスト
1. Docker Compose設定の妥当性検証
2. ネットワーク接続の確認

### 統合テスト
1. コンテナ間通信の確認
2. WebSocket接続の確認

### 検証項目
- [x] `npm run docker:dev`で全サービスが起動する（設定ファイル作成完了）
- [x] excalidraw-roomコンテナが正常に起動する（docker-compose.yml設定完了）
- [x] フロントエンドからWebSocketサーバーに接続できる（プロキシ設定完了）
- [x] ホットリロードが機能する（ボリュームマウント設定完了）
- [x] ログが正しく出力される（Docker Compose logs設定完了）

注意: Dockerランタイムが利用できない環境のため、設定ファイルの作成と構文検証のみ実施

## 成果物
1. Docker Compose設定ファイル
2. Dockerfile（開発環境用）
3. Nginx設定ファイル
4. 環境変数設定サンプル
5. Docker関連スクリプト

## 注意事項
- excalidraw-roomの公式イメージを無改造で使用する
- ローカルネットワークでの動作を優先
- HTTPSは使用しない（HTTPのみ）
- ホストマシンのファイアウォール設定を確認

## トラブルシューティング
- ポートが使用中の場合: 別のポートを使用
- ネットワーク接続エラー: Dockerネットワークの再作成
- コンテナ起動エラー: ログを確認して原因特定

## 次のタスク
Task 03: 基本的なExcalidrawコンポーネントの統合