# タスク09: デプロイ設定

## 目的

Docker Composeを使用して、ローカルネットワーク環境でのセルフホスティングを可能にするデプロイメント設定を作成する。

## 前提条件

- [x] タスク06（リアルタイムコラボレーション実装）が完了していること
- [x] タスク08（統合テスト実装）が完了していること
- [x] すべてのテストが通過していること

## 設定項目

### 1. Docker構成

- [x] フロントエンド用Dockerfile
- [x] docker-compose.yml（本番環境用）
- [x] 環境変数設定
- [x] ボリューム設定

### 2. ビルド設定

- [x] フロントエンドのビルド設定
- [x] 最適化設定
- [x] 環境別設定の管理
- [x] ビルドスクリプト

### 3. ネットワーク設定

- [x] ローカルネットワーク設定
- [x] CORS設定
- [x] プロキシ設定（必要な場合）
- [x] ポート設定

### 4. 運用設定

- [x] ログ設定
- [x] ヘルスチェック
- [x] 自動再起動設定
- [x] バックアップ設定

## 成果物

- [x] Dockerfile（フロントエンド用）
- [x] docker-compose.prod.yml（本番用）
- [ ] デプロイメントガイド（docs/deployment-guide.md）
- [ ] 運用マニュアル（docs/operation-manual.md）

## 実施手順

1. フロントエンド用Dockerfileの作成
   ```dockerfile
   # Dockerfile
   # ビルドステージ
   FROM node:18-alpine as builder
   
   WORKDIR /app
   
   # 依存関係のインストール
   COPY package*.json ./
   RUN npm ci
   
   # ソースコードのコピーとビルド
   COPY . .
   RUN npm run build
   
   # 実行ステージ
   FROM nginx:alpine
   
   # Nginxの設定
   COPY nginx.conf /etc/nginx/nginx.conf
   COPY --from=builder /app/dist /usr/share/nginx/html
   
   EXPOSE 80
   
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. Nginx設定
   ```nginx
   # nginx.conf
   events {
       worker_connections 1024;
   }
   
   http {
       include /etc/nginx/mime.types;
       default_type application/octet-stream;
       
       server {
           listen 80;
           server_name localhost;
           
           root /usr/share/nginx/html;
           index index.html;
           
           # SPAのためのフォールバック
           location / {
               try_files $uri $uri/ /index.html;
           }
           
           # WebSocket プロキシ設定
           location /socket.io/ {
               proxy_pass http://backend:80;
               proxy_http_version 1.1;
               proxy_set_header Upgrade $http_upgrade;
               proxy_set_header Connection "upgrade";
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
           }
           
           # セキュリティヘッダー
           add_header X-Frame-Options "SAMEORIGIN" always;
           add_header X-Content-Type-Options "nosniff" always;
           add_header X-XSS-Protection "1; mode=block" always;
       }
   }
   ```

3. Docker Compose設定
   ```yaml
   # docker-compose.yml
   version: '3.8'
   
   services:
     frontend:
       build: ./frontend
       ports:
         - "80:80"
       depends_on:
         - backend
       environment:
         - BACKEND_URL=http://backend:80
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
         interval: 30s
         timeout: 10s
         retries: 3
     
     backend:
       image: excalidraw/excalidraw-room:latest
       expose:
         - "80"
       environment:
         - NODE_ENV=production
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
         interval: 30s
         timeout: 10s
         retries: 3
   
   networks:
     default:
       driver: bridge
   ```

4. 環境設定
   ```bash
   # .env.production
   VITE_WEBSOCKET_URL=/socket.io
   VITE_APP_TITLE=Excalidraw Board
   ```

5. ビルドスクリプト
   ```json
   {
     "scripts": {
       "build": "vite build",
       "build:docker": "docker-compose build",
       "deploy:local": "docker-compose up -d",
       "deploy:stop": "docker-compose down",
       "logs": "docker-compose logs -f"
     }
   }
   ```

## デプロイ手順

1. **初回セットアップ**
   ```bash
   # リポジトリのクローン
   git clone <repository-url>
   cd excalidraw-board
   
   # 環境変数の設定
   cp .env.example .env.production
   
   # ビルド
   docker-compose build
   ```

2. **起動**
   ```bash
   # サービスの起動
   docker-compose up -d
   
   # ログの確認
   docker-compose logs -f
   ```

3. **アクセス確認**
   - ブラウザで http://localhost にアクセス
   - 複数のブラウザ/タブで動作確認

## 運用タスク

### 日常運用

- [ ] サービス状態の確認方法
- [ ] ログの確認方法
- [ ] 再起動手順
- [ ] アップデート手順

### トラブルシューティング

1. **サービスが起動しない**
   ```bash
   # 状態確認
   docker-compose ps
   
   # ログ確認
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. **接続できない**
   - ポートの確認
   - ファイアウォール設定
   - Nginx設定の確認

3. **WebSocketエラー**
   - プロキシ設定の確認
   - バックエンドの状態確認

## セキュリティ考慮事項

- [ ] HTTPSの設定（必要に応じて）
- [ ] アクセス制限（必要に応じて）
- [ ] ログの適切な管理
- [ ] 定期的なアップデート

## バックアップ

```bash
# データのバックアップ（必要に応じて）
docker-compose exec backend backup-script.sh

# 設定のバックアップ
tar -czf config-backup.tar.gz docker-compose.yml nginx.conf .env*
```

## 監視

- [ ] ヘルスチェックエンドポイント
- [ ] リソース使用状況の監視
- [ ] エラーログの監視
- [ ] アラート設定（任意）

## 完了条件

- [x] Docker Composeでサービスが起動する
- [x] フロントエンドとバックエンドが連携する
- [x] 複数ユーザーでのコラボレーションが動作する
- [ ] ドキュメントが整備されている
- [ ] 運用手順が明確になっている