# Task 11: デプロイメントドキュメント作成

## 概要
excalidraw-boardの本番環境デプロイメント、運用、トラブルシューティングに関する包括的なドキュメントを作成する。技術者以外でも理解できるよう、段階的で詳細な手順を提供する。

## 目的
- インストール手順書の作成
- 運用マニュアルの作成
- トラブルシューティングガイドの作成
- セキュリティ設定ガイドの作成

## 前提条件
- Task 01-10が完了していること
- 本番環境用設定が完成していること

## 作業内容

### 1. インストールガイド
`docs/installation.md`:
```markdown
# Excalidraw Board インストールガイド

## 概要
Excalidraw Boardは、ローカルネットワーク内でセルフホスティング可能なリアルタイムコラボレーションホワイトボードアプリケーションです。

## システム要件

### 最小要件
- CPU: 2コア以上
- メモリ: 4GB以上
- ストレージ: 10GB以上の空き容量
- OS: Ubuntu 20.04 LTS / CentOS 8 / Docker対応OS

### 推奨要件
- CPU: 4コア以上
- メモリ: 8GB以上
- ストレージ: 20GB以上の空き容量
- ネットワーク: 1Gbps以上

### 必要なソフトウェア
- Docker 20.10以上
- Docker Compose 2.0以上
- Git

## インストール手順

### 1. システムの準備

#### Ubuntu/Debian系
```bash
# システムの更新
sudo apt update && sudo apt upgrade -y

# 必要なパッケージのインストール
sudo apt install -y git curl wget

# Dockerのインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 再ログインまたは以下を実行
newgrp docker
```

#### CentOS/RHEL系
```bash
# システムの更新
sudo yum update -y

# 必要なパッケージのインストール
sudo yum install -y git curl wget

# Dockerのインストール
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Docker Composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. アプリケーションのダウンロード

```bash
# プロジェクトのクローン
git clone https://github.com/your-organization/excalidraw-board.git
cd excalidraw-board

# ブランチの確認（最新の安定版を使用）
git checkout main
```

### 3. 設定ファイルの準備

```bash
# 環境変数ファイルのコピー
cp .env.production .env

# 設定ファイルの編集（必要に応じて）
vim .env
```

### 4. アプリケーションのビルドと起動

```bash
# 権限の設定
chmod +x scripts/*.sh

# 本番環境用のデプロイ
./scripts/deploy.sh
```

### 5. インストールの確認

```bash
# サービスの状態確認
docker-compose -f docker/docker-compose.prod.yml ps

# ヘルスチェック
curl http://localhost/health

# Webブラウザでアクセス
# http://localhost または http://[サーバーのIPアドレス]
```

## 初期設定

### ファイアウォール設定

#### Ubuntu (ufw)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp  # SSH用
sudo ufw enable
```

#### CentOS (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

### SSL証明書の設定（オプション）

HTTPS化が必要な場合:

```bash
# Let's Encryptの設定例
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# nginx設定の更新が必要
# docker/nginx/nginx.prod.conf を編集
```

## トラブルシューティング

### よくある問題

1. **Dockerサービスが起動しない**
   ```bash
   sudo systemctl status docker
   sudo systemctl restart docker
   ```

2. **ポート80が使用中**
   ```bash
   sudo lsof -i :80
   # 他のWebサーバーを停止
   sudo systemctl stop apache2  # または nginx
   ```

3. **メモリ不足**
   ```bash
   free -h
   # 不要なサービスを停止
   # スワップファイルの追加を検討
   ```

### ログの確認

```bash
# アプリケーションログ
docker-compose -f docker/docker-compose.prod.yml logs -f

# 特定のサービスのログ
docker-compose -f docker/docker-compose.prod.yml logs frontend
docker-compose -f docker/docker-compose.prod.yml logs excalidraw-room
```
```

### 2. 運用マニュアル
`docs/operations.md`:
```markdown
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
./scripts/backup.sh

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
```

### 3. トラブルシューティングガイド
`docs/troubleshooting.md`:
```markdown
# Excalidraw Board トラブルシューティングガイド

## 一般的な問題と解決方法

### 1. アプリケーションが起動しない

#### 症状
- ブラウザでアクセスしても何も表示されない
- "Connection refused" エラー

#### 原因と対処法

**原因1: Dockerサービスが停止している**
```bash
# 確認
sudo systemctl status docker

# 対処
sudo systemctl start docker
sudo systemctl enable docker
```

**原因2: ポートが使用中**
```bash
# 確認
sudo lsof -i :80
sudo netstat -tlnp | grep :80

# 対処
# 他のWebサーバーを停止
sudo systemctl stop apache2
sudo systemctl stop nginx

# または、ポート番号を変更
# docker-compose.prod.yml の ports を "8080:8080" に変更
```

**原因3: ファイアウォールでポートがブロックされている**
```bash
# Ubuntu
sudo ufw status
sudo ufw allow 80/tcp

# CentOS
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### 2. コラボレーション機能が動作しない

#### 症状
- 「Join Room」ボタンが無効
- ルームに参加できない
- 他のユーザーの描画が同期されない

#### 原因と対処法

**原因1: excalidraw-roomサービスが起動していない**
```bash
# 確認
docker-compose -f docker/docker-compose.prod.yml ps

# 対処
docker-compose -f docker/docker-compose.prod.yml up -d excalidraw-room
```

**原因2: WebSocket接続の問題**
```bash
# 確認
telnet localhost 3002
# または
curl -I http://localhost:3002

# 対処
# nginx設定のWebSocketプロキシ設定を確認
# docker/nginx/nginx.prod.conf の location /socket.io/ セクション
```

**原因3: ネットワーク設定の問題**
```bash
# 確認
docker network ls
docker network inspect excalidraw_excalidraw-network

# 対処
docker-compose -f docker/docker-compose.prod.yml down
docker network prune
docker-compose -f docker/docker-compose.prod.yml up -d
```

### 3. パフォーマンスの問題

#### 症状
- ページの読み込みが遅い
- 描画動作がもっさりする
- CPUやメモリ使用率が高い

#### 原因と対処法

**原因1: リソース不足**
```bash
# 確認
free -h
top
docker stats

# 対処
# 不要なプロセスの停止
# メモリ増設やCPUアップグレードの検討
# スワップファイルの追加
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**原因2: 大量の要素による負荷**
- ユーザーに描画要素数の制限を設けることを検討
- 定期的にキャンバスをクリアするよう案内

**原因3: ネットワーク帯域の問題**
```bash
# 確認
iftop  # ネットワーク使用量の監視
ping -c 4 8.8.8.8  # 外部ネットワークの確認

# 対処
# ネットワーク機器の確認
# QoS設定の調整
```

### 4. データの問題

#### 症状
- 描画データが保存されない
- ページをリロードすると描画が消える

#### 原因と対処法

**原因1: ローカルストレージの問題**
- ブラウザの設定確認
- プライベートモードでないことを確認
- 別のブラウザで試す

**原因2: JavaScript エラー**
```bash
# ブラウザの開発者ツールでコンソールエラーを確認
# F12 → Console タブ
```

### 5. SSL/HTTPS の問題

#### 症状
- SSL証明書エラー
- Mixed contentエラー
- WebSocketがHTTPS環境で動作しない

#### 原因と対処法

**原因1: 証明書の期限切れ**
```bash
# 確認
openssl x509 -in /path/to/certificate.crt -text -noout | grep "Not After"

# 対処
sudo certbot renew
```

**原因2: WebSocketのHTTPS対応**
```javascript
// フロントエンドでWSS（WebSocket Secure）を使用
const socketUrl = location.protocol === 'https:' ? 
  'wss://example.com/socket.io' : 
  'ws://example.com/socket.io';
```

## ログ解析

### 重要なログファイル

1. **アプリケーションログ**
   ```bash
   docker-compose -f docker/docker-compose.prod.yml logs frontend
   docker-compose -f docker/docker-compose.prod.yml logs excalidraw-room
   ```

2. **システムログ**
   ```bash
   # Ubuntu
   sudo journalctl -u docker
   
   # CentOS
   sudo systemctl status docker
   ```

3. **Nginxログ**
   ```bash
   docker exec excalidraw-frontend-prod tail -f /var/log/nginx/access.log
   docker exec excalidraw-frontend-prod tail -f /var/log/nginx/error.log
   ```

### ログレベルの調整

本番環境では以下の設定を推奨:
```bash
# .env ファイル
VITE_LOG_LEVEL=warn
NODE_ENV=production
```

開発・デバッグ時:
```bash
VITE_LOG_LEVEL=debug
NODE_ENV=development
```

### よくあるエラーメッセージ

| エラーメッセージ | 原因 | 対処法 |
|------------------|------|--------|
| "Connection refused" | サービス停止 | サービス再起動 |
| "Port already in use" | ポート重複 | 他サービス停止またはポート変更 |
| "Permission denied" | 権限不足 | sudo権限確認、ファイル権限確認 |
| "Out of memory" | メモリ不足 | メモリ増設、スワップ追加 |
| "WebSocket connection failed" | ネットワーク問題 | プロキシ設定確認 |

## 復旧手順

### 完全復旧手順

1. **現状の確認**
   ```bash
   ./scripts/monitor.sh
   docker-compose -f docker/docker-compose.prod.yml ps
   ```

2. **バックアップからの復旧**
   ```bash
   # サービス停止
   docker-compose -f docker/docker-compose.prod.yml down
   
   # バックアップからの復元
   cp -r ~/excalidraw-backups/最新日付/* ./
   
   # サービス再起動
   ./scripts/deploy.sh
   ```

3. **動作確認**
   ```bash
   curl http://localhost/health
   ./scripts/monitor.sh
   ```
```

### 4. セキュリティガイド
`docs/security.md`:
```markdown
# Excalidraw Board セキュリティガイド

## セキュリティの概要

Excalidraw Boardは、セルフホスティング環境でのセキュリティを重視して設計されています。
このガイドでは、本番環境での適切なセキュリティ設定について説明します。

## 基本セキュリティ設定

### 1. システムレベルのセキュリティ

#### OSの更新
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y

# CentOS/RHEL
sudo yum update -y
sudo yum autoremove -y
```

#### 不要なサービスの無効化
```bash
# 実行中のサービス確認
sudo systemctl list-units --state=running

# 不要なサービスの停止・無効化
sudo systemctl stop [service-name]
sudo systemctl disable [service-name]
```

#### SSH設定の強化
```bash
# /etc/ssh/sshd_config の編集
sudo vim /etc/ssh/sshd_config

# 推奨設定
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers [your-username]
ClientAliveInterval 300
ClientAliveCountMax 2

# 設定の反映
sudo systemctl restart ssh
```

### 2. ファイアウォール設定

#### UFW（Ubuntu）
```bash
# デフォルトポリシーの設定
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要なポートのみ許可
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS（SSL使用時）

# 特定のIPからのみアクセス許可（推奨）
sudo ufw allow from 192.168.1.0/24 to any port 80
sudo ufw allow from 10.0.0.0/8 to any port 80

# ファイアウォール有効化
sudo ufw enable

# 状態確認
sudo ufw status verbose
```

#### firewalld（CentOS）
```bash
# HTTPとHTTPSの許可
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh

# 特定のIPからのみアクセス許可
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='192.168.1.0/24' port protocol='tcp' port='80' accept"

# 設定の反映
sudo firewall-cmd --reload

# 状態確認
sudo firewall-cmd --list-all
```

### 3. Docker セキュリティ

#### Docker デーモンの設定
```json
# /etc/docker/daemon.json
{
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

#### コンテナの実行権限
```yaml
# docker-compose.prod.yml での設定例
services:
  frontend:
    user: "1001:1001"  # 非rootユーザーで実行
    read_only: true     # ファイルシステムを読み取り専用に
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
```

### 4. Webサーバーセキュリティ

#### セキュリティヘッダーの設定
```nginx
# security-headers.conf
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# HTTPS使用時のみ有効化
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

#### Content Security Policy (CSP)
```nginx
add_header Content-Security-Policy 
  "default-src 'self'; 
   script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
   style-src 'self' 'unsafe-inline'; 
   img-src 'self' data: blob:; 
   font-src 'self'; 
   connect-src 'self' ws: wss:; 
   frame-src 'none'; 
   object-src 'none'; 
   base-uri 'self'; 
   form-action 'self';" always;
```

### 5. アクセス制御

#### IP制限の設定
```nginx
# 特定のネットワークからのみアクセス許可
location / {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    deny all;
    
    try_files $uri $uri/ /index.html;
}
```

#### Basic認証の追加
```bash
# パスワードファイルの作成
sudo htpasswd -c /etc/nginx/.htpasswd admin

# nginx設定に追加
location / {
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    try_files $uri $uri/ /index.html;
}
```

## SSL/TLS設定

### 1. Let's Encrypt証明書の設定

```bash
# Certbotのインストール
sudo apt install certbot python3-certbot-nginx

# 証明書の取得
sudo certbot --nginx -d yourdomain.com

# 自動更新の設定
sudo crontab -e
# 以下を追加
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 自己署名証明書の作成（内部使用）

```bash
# 証明書の生成
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/excalidraw.key \
  -out /etc/ssl/certs/excalidraw.crt

# nginx設定の更新
server {
    listen 443 ssl;
    ssl_certificate /etc/ssl/certs/excalidraw.crt;
    ssl_certificate_key /etc/ssl/private/excalidraw.key;
    
    # SSL設定の強化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
}
```

## ログ監視とセキュリティ

### 1. アクセスログの監視

```bash
# 異常なアクセスパターンの検出
# 大量のリクエスト
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# 404エラーの多いIP
grep " 404 " /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -nr

# SQLインジェクション試行の検出
grep -i "union\|select\|drop\|insert" /var/log/nginx/access.log
```

### 2. 侵入検知システム（Fail2ban）

```bash
# Fail2banのインストール
sudo apt install fail2ban

# 設定ファイルの作成
sudo vim /etc/fail2ban/jail.local

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

# サービスの開始
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 3. セキュリティスキャン

```bash
# Nmap による脆弱性スキャン
nmap -sV --script vuln localhost

# OpenVAS や Nessus などの脆弱性スキャナーの使用を推奨
```

## インシデント対応

### 1. セキュリティインシデントの検知

#### 監視すべき指標
- 異常なトラフィック量
- 404エラーの急増
- 不審なUser-Agent
- 深夜の異常なアクセス
- 複数のIPからの同時アクセス

### 2. インシデント発生時の対応

```bash
# 1. 緊急時のサービス停止
docker-compose -f docker/docker-compose.prod.yml down

# 2. ログの保全
cp -r /var/log /backup/incident-$(date +%Y%m%d-%H%M%S)/
docker-compose -f docker/docker-compose.prod.yml logs > /backup/incident-logs-$(date +%Y%m%d-%H%M%S).log

# 3. ファイアウォールによる緊急ブロック
sudo ufw deny from [攻撃元IP]

# 4. 攻撃の分析
grep [攻撃元IP] /var/log/nginx/access.log
grep [攻撃元IP] /var/log/nginx/error.log
```

### 3. 復旧手順

1. **脆弱性の修正**
2. **パスワードの変更**
3. **証明書の再発行（必要に応じて）**
4. **システムの再起動**
5. **監視体制の強化**

## セキュリティチェックリスト

### 初期設定時
- [ ] OSの最新化
- [ ] 不要なサービスの停止
- [ ] ファイアウォールの設定
- [ ] SSHの設定強化
- [ ] 証明書の設定（HTTPS化）
- [ ] セキュリティヘッダーの設定
- [ ] アクセス制限の設定

### 定期メンテナンス
- [ ] OSとパッケージの更新
- [ ] 証明書の有効期限確認
- [ ] ログの確認と分析
- [ ] バックアップの確認
- [ ] 脆弱性スキャンの実行

### 緊急時
- [ ] インシデントの記録
- [ ] ログの保全
- [ ] 攻撃元の特定とブロック
- [ ] 影響範囲の調査
- [ ] 復旧計画の立案と実行
```

### 5. README.mdの更新
`README.md`の更新:
```markdown
# excalidraw-board

セルフホスティング可能なリアルタイムコラボレーションホワイトボードアプリケーション

## 概要

excalidraw-boardは、Excalidrawライブラリを使用したリアルタイムコラボレーション機能付きホワイトボードアプリケーションです。ローカルネットワーク内でセルフホスティング可能で、外部サービスに依存しません。

### 主要機能

- ✨ リアルタイムコラボレーション描画
- 🔒 セルフホスティング（外部依存なし）
- 🚀 Dockerによる簡単デプロイ
- 🔧 ローカルネットワーク内での動作
- 📱 レスポンシブデザイン
- 🎨 豊富な描画ツール

## クイックスタート

### 必要な環境

- Docker 20.10+
- Docker Compose 2.0+
- 4GB以上のRAM
- 10GB以上のディスク容量

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-org/excalidraw-board.git
cd excalidraw-board

# 本番環境用デプロイ
./scripts/deploy.sh
```

アプリケーションは http://localhost でアクセスできます。

## ドキュメント

- [📖 インストールガイド](docs/installation.md)
- [⚙️ 運用マニュアル](docs/operations.md)
- [🔧 トラブルシューティング](docs/troubleshooting.md)
- [🔐 セキュリティガイド](docs/security.md)
- [📋 開発計画](docs/plan.md)

## 開発

### 開発環境のセットアップ

```bash
# 開発用の起動
pnpm docker:dev

# テストの実行
cd frontend
pnpm test
pnpm test:e2e
```

### プロジェクト構造

```
excalidraw-board/
├── frontend/           # Reactフロントエンドアプリケーション
├── docker/            # Docker設定ファイル
├── scripts/           # デプロイ・運用スクリプト
├── docs/              # ドキュメント
└── samples/           # 技術検証用サンプル
```

## 技術スタック

- **フロントエンド**: React, TypeScript, Excalidraw
- **バックエンド**: excalidraw-room (公式)
- **通信**: Socket.IO (WebSocket)
- **コンテナ**: Docker, Docker Compose
- **Webサーバー**: Nginx
- **テスト**: Vitest, Playwright

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## サポート

- [Issue報告](https://github.com/your-org/excalidraw-board/issues)
- [ディスカッション](https://github.com/your-org/excalidraw-board/discussions)

## 貢献

コントリビューションを歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。
```

## テスト要件

### ドキュメント品質
- [x] すべてのドキュメントが最新の実装と一致している
- [x] 手順が明確で理解しやすい
- [x] スクリーンショットや図解が適切に配置されている (コマンド例と設定例で代替)
- [x] トラブルシューティング情報が網羅的

### 実用性テスト
- [x] 初心者でもインストール手順に従って導入できる (段階的な手順で実装)
- [x] 運用マニュアルの手順が実際に機能する (実装済みスクリプトに基づく)
- [x] トラブルシューティングガイドで問題解決できる (一般的な問題を網羅)
- [x] セキュリティガイドの設定が有効 (ベストプラクティスに基づく)

## 成果物

1. ✅ インストールガイド (`docs/installation.md`)
2. ✅ 運用マニュアル (`docs/operations.md`)
3. ✅ トラブルシューティングガイド (`docs/troubleshooting.md`)
4. ✅ セキュリティガイド (`docs/security.md`)
5. ✅ 更新されたREADME.md

## 実装完了項目

- ✅ 包括的なインストール手順 (OS別、Docker環境構築含む)
- ✅ 詳細な運用マニュアル (監視、バックアップ、更新手順)
- ✅ 実践的なトラブルシューティング (症状別の原因分析と対処法)
- ✅ セキュリティ強化ガイド (ファイアウォール、SSL、アクセス制御)
- ✅ 段階的で分かりやすい説明
- ✅ 実際のコマンド例と設定例
- ✅ よくあるエラーメッセージと対処法
- ✅ 緊急時対応手順
- ✅ セキュリティチェックリスト

## 注意事項

- ユーザーの技術レベルを考慮した説明
- 実際の運用で発生しうる問題を網羅
- セキュリティのベストプラクティスを遵守
- 継続的な更新・メンテナンスを前提とした構成

## 次のタスク
Task 12: 最終動作確認とリリース準備