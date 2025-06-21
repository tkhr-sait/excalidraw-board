# Excalidraw Board インストールガイド

## 概要

Excalidraw Board は、ローカルネットワーク内でセルフホスティング可能なリアルタイムコラボレーションホワイトボードアプリケーションです。

## システム要件

### 最小要件

- CPU: 2 コア以上
- メモリ: 4GB 以上
- ストレージ: 10GB 以上の空き容量
- OS: Ubuntu 20.04 LTS / CentOS 8 / Docker 対応 OS

### 推奨要件

- CPU: 4 コア以上
- メモリ: 8GB 以上
- ストレージ: 20GB 以上の空き容量
- ネットワーク: 1Gbps 以上

### 必要なソフトウェア

- Docker 20.10 以上
- Docker Compose 2.0 以上
- Git

## インストール手順

### 1. システムの準備

#### Ubuntu/Debian 系

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

#### CentOS/RHEL 系

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
git clone https://github.com/tkhr-sait/excalidraw-board.git
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

### SSL 証明書の設定（オプション）

HTTPS 化が必要な場合:

```bash
# Let's Encryptの設定例
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# nginx設定の更新が必要
# docker/nginx/nginx.prod.conf を編集
```

## トラブルシューティング

### よくある問題

1. **Docker サービスが起動しない**

   ```bash
   sudo systemctl status docker
   sudo systemctl restart docker
   ```

2. **ポート 80 が使用中**

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
