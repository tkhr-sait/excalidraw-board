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