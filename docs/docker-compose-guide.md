# Docker Compose 運用ガイド

## 起動方法

### 本番環境
```bash
./scripts/deploy-docker.sh
```

### 開発環境
```bash
# フォアグラウンドで起動（ログを確認したい場合）
docker-compose -f docker-compose.dev.yml up

# バックグラウンドで起動
docker-compose -f docker-compose.dev.yml up -d

# 注意：初回起動時はnpm installのため時間がかかります
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