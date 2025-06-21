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