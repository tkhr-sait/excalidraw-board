# Excalidraw Board 運用マニュアル

## 日常運用

### 1. システム監視

#### 定期チェック項目
- サービス稼働状況
- CPU・メモリ使用率
- ディスク使用量
- ネットワーク接続状況

#### 監視コマンド
```bash
# システム全体の監視
./scripts/monitor.sh

# リアルタイム監視
watch -n 5 './scripts/monitor.sh'
```

### 2. バックアップ

#### 設定ファイルのバックアップ
```bash
# バックアップディレクトリの作成
mkdir -p ~/excalidraw-backups/$(date +%Y%m%d)

# 設定ファイルのバックアップ
cp -r docker/ ~/excalidraw-backups/$(date +%Y%m%d)/
cp .env ~/excalidraw-backups/$(date +%Y%m%d)/
cp -r scripts/ ~/excalidraw-backups/$(date +%Y%m%d)/
```

#### Dockerイメージのバックアップ
```bash
# イメージの保存
docker save excalidraw-board_frontend:latest | gzip > ~/excalidraw-backups/$(date +%Y%m%d)/frontend.tar.gz
```

### 3. 更新・メンテナンス

#### アプリケーションの更新
```bash
# 1. 現在の状態をバックアップ
mkdir -p ~/excalidraw-backups/$(date +%Y%m%d)
cp -r docker/ ~/excalidraw-backups/$(date +%Y%m%d)/
cp .env ~/excalidraw-backups/$(date +%Y%m%d)/

# 2. 最新コードの取得
git fetch origin
git checkout main
git pull origin main

# 3. アプリケーションの更新
./scripts/deploy.sh

# 4. 動作確認
./scripts/monitor.sh
```

#### システムの再起動
```bash
# グレースフルな再起動
docker-compose -f docker/docker-compose.prod.yml restart

# 完全な再起動
docker-compose -f docker/docker-compose.prod.yml down
docker-compose -f docker/docker-compose.prod.yml up -d
```

### 4. パフォーマンス監視

#### メトリクスの確認
- CPU使用率: 80%以下を維持
- メモリ使用率: 80%以下を維持
- ディスク使用率: 80%以下を維持
- レスポンス時間: 1秒以下を維持

#### パフォーマンス改善
```bash
# Dockerイメージの最適化
docker system prune -f

# 未使用ボリュームの削除
docker volume prune -f

# システムリソースの確認
docker stats
```

## 緊急時対応

### 1. サービス停止時の対応

#### 症状: Webサイトにアクセスできない
```bash
# 1. サービス状態の確認
docker-compose -f docker/docker-compose.prod.yml ps

# 2. ログの確認
docker-compose -f docker/docker-compose.prod.yml logs --tail=50

# 3. サービスの再起動
docker-compose -f docker/docker-compose.prod.yml restart

# 4. それでも復旧しない場合
docker-compose -f docker/docker-compose.prod.yml down
docker-compose -f docker/docker-compose.prod.yml up -d
```

#### 症状: コラボレーション機能が動作しない
```bash
# 1. excalidraw-roomサービスの確認
docker-compose -f docker/docker-compose.prod.yml logs excalidraw-room

# 2. ネットワーク接続の確認
telnet localhost 3002

# 3. excalidraw-roomの再起動
docker-compose -f docker/docker-compose.prod.yml restart excalidraw-room
```

### 2. 高負荷時の対応

#### CPU使用率が90%を超えた場合
```bash
# 1. プロセスの確認
docker stats

# 2. 負荷の高いコンテナを特定
# 必要に応じてリソース制限を調整

# 3. スケールアップの検討
# より高性能なサーバーへの移行を検討
```

#### メモリ不足の場合
```bash
# 1. メモリ使用量の確認
free -h
docker stats

# 2. 不要なプロセスの停止
# 3. スワップファイルの追加
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. データ復旧

#### 設定ファイルの復旧
```bash
# バックアップからの復旧
cp ~/excalidraw-backups/20231201/* ./

# サービスの再起動
./scripts/deploy.sh
```

## セキュリティ管理

### 1. アクセス制御

#### IP制限の設定
nginx設定ファイルに以下を追加:
```nginx
# 特定のIPからのみアクセスを許可
allow 192.168.1.0/24;
allow 10.0.0.0/8;
deny all;
```

#### Basic認証の設定
```bash
# パスワードファイルの作成
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd username

# nginx設定に追加
auth_basic "Restricted Area";
auth_basic_user_file /etc/nginx/.htpasswd;
```

### 2. SSL/TLS設定

#### 証明書の更新
```bash
# Let's Encryptの証明書更新
sudo certbot renew

# nginxの再起動
docker-compose -f docker/docker-compose.prod.yml restart frontend
```

### 3. ログ監視

#### セキュリティイベントの監視
```bash
# アクセスログの確認
docker-compose -f docker/docker-compose.prod.yml logs frontend | grep -E "40[0-9]|50[0-9]"

# 異常なアクセスパターンの検出
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
```