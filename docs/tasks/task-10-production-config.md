# Task 10: 本番環境用設定

## 概要
プロダクション環境でのデプロイに必要な設定を実装する。セキュリティ、パフォーマンス、モニタリング、ログ管理を考慮した本番用設定を作成する。

## 目的
- 本番環境用Docker設定
- セキュリティ強化設定
- ログ管理とモニタリング
- 環境変数管理

## 前提条件
- Task 01-09が完了していること
- DockerおよびDocker Composeが利用可能であること

## 作業内容

### 1. 本番環境用Dockerfile
`docker/Dockerfile.frontend.prod`:
```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

# pnpmのインストール
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

WORKDIR /app

# 依存関係のインストール
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# アプリケーションコードのコピー
COPY . .

# ビルド実行
RUN pnpm build

# Production stage
FROM nginx:alpine AS production

# セキュリティ強化: 不要なパッケージを削除
RUN apk del --no-cache apk-tools

# nginxユーザーで実行
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-app -g nginx-app nginx-app

# ビルド成果物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx設定ファイルをコピー
COPY docker/nginx/nginx.prod.conf /etc/nginx/nginx.conf
COPY docker/nginx/security-headers.conf /etc/nginx/security-headers.conf

# ポートを非特権ポートに変更
EXPOSE 8080

# ヘルスチェックスクリプトを追加
COPY docker/scripts/healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# 非ルートユーザーで実行
USER nginx-app

CMD ["nginx", "-g", "daemon off;"]
```

### 2. 本番環境用Nginx設定
`docker/nginx/nginx.prod.conf`:
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # ログフォーマット
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    '$request_time $upstream_response_time';
                    
    access_log /var/log/nginx/access.log main;
    
    # パフォーマンス設定
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # セキュリティ設定
    server_tokens off;
    client_max_body_size 10M;
    client_body_timeout 30s;
    client_header_timeout 30s;
    
    # Gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # キャッシュ設定
    map $sent_http_content_type $expires {
        default                    off;
        text/html                  epoch;
        text/css                   max;
        application/javascript     max;
        ~image/                    1M;
        ~font/                     1M;
    }
    
    server {
        listen 8080;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # セキュリティヘッダーを読み込み
        include /etc/nginx/security-headers.conf;
        
        expires $expires;
        
        # SPA用のフォールバック設定
        location / {
            try_files $uri $uri/ /index.html;
            
            # CSPヘッダーの設定
            add_header Content-Security-Policy 
                "default-src 'self'; 
                 script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
                 style-src 'self' 'unsafe-inline'; 
                 img-src 'self' data: blob:; 
                 font-src 'self'; 
                 connect-src 'self' ws: wss:; 
                 frame-src 'none'; 
                 object-src 'none'" always;
        }
        
        # 静的アセット用のキャッシュ設定
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        # WebSocketプロキシ（excalidraw-room用）
        location /socket.io/ {
            proxy_pass http://excalidraw-room:80;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket用タイムアウト設定
            proxy_connect_timeout 1d;
            proxy_send_timeout 1d;
            proxy_read_timeout 1d;
        }
        
        # ヘルスチェックエンドポイント
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # エラーページ
        error_page 404 /404.html;
        error_page 500 502 503 504 /50x.html;
        
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
```

`docker/nginx/security-headers.conf`:
```nginx
# セキュリティヘッダーの設定
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# HSTS (本番環境でHTTPSを使用する場合に有効化)
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. 本番環境用Docker Compose
`docker/docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  # Excalidraw Roomサーバー
  excalidraw-room:
    image: excalidraw/excalidraw-room:latest
    container_name: excalidraw-room-prod
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    networks:
      - excalidraw-network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # フロントエンドアプリケーション
  frontend:
    build:
      context: ../frontend
      dockerfile: ../docker/Dockerfile.frontend.prod
    container_name: excalidraw-frontend-prod
    ports:
      - "80:8080"
    environment:
      - NODE_ENV=production
    networks:
      - excalidraw-network
    depends_on:
      excalidraw-room:
        condition: service_healthy
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "/usr/local/bin/healthcheck.sh"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s

  # ログ集約（オプション）
  log-aggregator:
    image: fluent/fluent-bit:latest
    container_name: log-aggregator
    volumes:
      - ./fluent-bit/fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    networks:
      - excalidraw-network
    restart: unless-stopped
    depends_on:
      - frontend
      - excalidraw-room

  # メトリクス監視（オプション）
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - excalidraw-network
    restart: unless-stopped

networks:
  excalidraw-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  prometheus_data:
```

### 4. ヘルスチェックスクリプト
`docker/scripts/healthcheck.sh`:
```bash
#!/bin/sh

# Basic health check for nginx
if ! pgrep nginx > /dev/null; then
    echo "Nginx is not running"
    exit 1
fi

# Check if the application is responding
if ! wget --quiet --tries=1 --spider http://localhost:8080/health; then
    echo "Application health check failed"
    exit 1
fi

echo "Health check passed"
exit 0
```

### 5. 環境変数管理
`.env.production`:
```bash
# アプリケーション設定
NODE_ENV=production
VITE_APP_TITLE=Excalidraw Board
VITE_APP_VERSION=1.0.0

# WebSocketサーバー設定
VITE_WEBSOCKET_SERVER_URL=ws://localhost/socket.io

# ログレベル
VITE_LOG_LEVEL=warn

# パフォーマンスモニタリング
VITE_ENABLE_PERFORMANCE_MONITORING=false
VITE_ENABLE_DEBUG_DASHBOARD=false

# セキュリティ設定
VITE_ENABLE_CSP=true
VITE_ENABLE_SECURITY_HEADERS=true

# コラボレーション設定
VITE_MAX_COLLABORATORS=50
VITE_SYNC_THROTTLE_DELAY=100
VITE_POINTER_THROTTLE_DELAY=50
```

### 6. ログ設定（Fluent Bit）
`docker/fluent-bit/fluent-bit.conf`:
```ini
[SERVICE]
    Flush         1
    Log_Level     info
    Daemon        off
    Parsers_File  parsers.conf
    HTTP_Server   On
    HTTP_Listen   0.0.0.0
    HTTP_Port     2020

[INPUT]
    Name              tail
    Path              /var/lib/docker/containers/*/*-json.log
    Parser            docker
    Tag               docker.*
    Refresh_Interval  5
    Mem_Buf_Limit     50MB
    Skip_Long_Lines   On

[FILTER]
    Name                kubernetes
    Match               docker.*
    Kube_URL            https://kubernetes.default.svc:443
    Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
    Merge_Log           On
    K8S-Logging.Parser  On
    K8S-Logging.Exclude Off

[OUTPUT]
    Name  forward
    Match *
    Host  log-server
    Port  24224
    
[OUTPUT]
    Name  stdout
    Match *
    Format json_lines
```

### 7. Prometheus設定
`docker/prometheus/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'excalidraw-frontend'
    static_configs:
      - targets: ['frontend:8080']
    scrape_interval: 30s
    metrics_path: '/metrics'
    
  - job_name: 'excalidraw-room'
    static_configs:
      - targets: ['excalidraw-room:80']
    scrape_interval: 30s
    metrics_path: '/metrics'
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['frontend:9113']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 8. デプロイメントスクリプト
`scripts/deploy.sh`:
```bash
#!/bin/bash

set -e

# 色付きメッセージ用の関数
print_status() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

# 環境確認
check_environment() {
    print_status "Checking environment..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_success "Environment check passed"
}

# 事前テスト
run_tests() {
    print_status "Running tests..."
    
    cd frontend
    
    # ユニットテスト
    pnpm test:run
    
    # リントチェック
    pnpm lint
    
    # 型チェック
    pnpm tsc --noEmit
    
    cd ..
    
    print_success "All tests passed"
}

# ビルド
building_images() {
    print_status "Building production images..."
    
    docker-compose -f docker/docker-compose.prod.yml build --no-cache
    
    print_success "Images built successfully"
}

# デプロイ
deploy() {
    print_status "Deploying to production..."
    
    # 既存のコンテナを停止
    docker-compose -f docker/docker-compose.prod.yml down --remove-orphans
    
    # 新しいコンテナを起動
    docker-compose -f docker/docker-compose.prod.yml up -d
    
    # ヘルスチェック
    print_status "Waiting for services to be healthy..."
    sleep 30
    
    if docker-compose -f docker/docker-compose.prod.yml ps | grep -q "unhealthy"; then
        print_error "Some services are unhealthy"
        docker-compose -f docker/docker-compose.prod.yml logs
        exit 1
    fi
    
    print_success "Deployment completed successfully"
}

# デプロイ後のテスト
post_deploy_tests() {
    print_status "Running post-deployment tests..."
    
    # ヘルスチェックエンドポイントのテスト
    if ! curl -f http://localhost/health; then
        print_error "Health check endpoint failed"
        exit 1
    fi
    
    # メインページのテスト
    if ! curl -f http://localhost/ > /dev/null; then
        print_error "Main page is not accessible"
        exit 1
    fi
    
    print_success "Post-deployment tests passed"
}

# メイン処理
main() {
    print_status "Starting production deployment..."
    
    check_environment
    run_tests
    building_images
    deploy
    post_deploy_tests
    
    print_success "Production deployment completed!"
    print_status "Application is available at: http://localhost"
}

# スクリプト実行
main "$@"
```

### 9. モニタリングスクリプト
`scripts/monitor.sh`:
```bash
#!/bin/bash

# システムのモニタリング
check_system_health() {
    echo "=== System Health Check ==="
    
    # Dockerコンテナの状態
    echo "Container Status:"
    docker-compose -f docker/docker-compose.prod.yml ps
    
    # メモリ使用量
    echo "\nMemory Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    # ディスク使用量
    echo "\nDisk Usage:"
    df -h
    
    # ネットワーク接続
    echo "\nNetwork Connections:"
    netstat -tuln | grep -E ':80|:3002'
}

# アプリケーションのモニタリング
check_application_health() {
    echo "\n=== Application Health Check ==="
    
    # HTTPレスポンスタイム
    echo "Response Time Test:"
    curl -o /dev/null -s -w "Time: %{time_total}s, Status: %{http_code}\n" http://localhost/
    curl -o /dev/null -s -w "Health endpoint - Time: %{time_total}s, Status: %{http_code}\n" http://localhost/health
    
    # WebSocket接続テスト
    echo "\nWebSocket Test:"
    if command -v wscat &> /dev/null; then
        timeout 5s wscat -c ws://localhost/socket.io/ && echo "WebSocket: OK" || echo "WebSocket: Failed"
    else
        echo "wscat not available, skipping WebSocket test"
    fi
}

# ログの確認
check_logs() {
    echo "\n=== Recent Logs ==="
    
    echo "Frontend Logs (last 20 lines):"
    docker-compose -f docker/docker-compose.prod.yml logs --tail=20 frontend
    
    echo "\nExcalidraw Room Logs (last 20 lines):"
    docker-compose -f docker/docker-compose.prod.yml logs --tail=20 excalidraw-room
}

# メイン関数
main() {
    check_system_health
    check_application_health
    check_logs
}

main "$@"
```

### 10. 本番環境用スクリプトの追加
`package.json`に追加:
```json
{
  "scripts": {
    "build:prod": "NODE_ENV=production vite build",
    "deploy:prod": "./scripts/deploy.sh",
    "monitor:prod": "./scripts/monitor.sh",
    "logs:prod": "docker-compose -f docker/docker-compose.prod.yml logs -f",
    "stop:prod": "docker-compose -f docker/docker-compose.prod.yml down",
    "restart:prod": "docker-compose -f docker/docker-compose.prod.yml restart"
  }
}
```

## テスト要件

### セキュリティテスト
- [ ] セキュリティヘッダーが正しく設定されている
- [ ] CSPポリシーが機能している
- [ ] 不要なポートが閉じられている
- [ ] 非特権ユーザーで実行されている

### パフォーマンステスト
- [ ] イメージサイズが最適化されている
- [ ] Gzip圧縮が機能している
- [ ] キャッシュが正しく設定されている
- [ ] レスポンスタイムが少ない

### モニタリングテスト
- [ ] ヘルスチェックが機能している
- [ ] ログが正しく出力されている
- [ ] メトリクスが収集されている

## 成果物
1. 本番環境用Dockerfile
2. セキュリティ強化されたNginx設定
3. 本番環境用Docker Compose設定
4. デプロイメントスクリプト
5. モニタリングスクリプト
6. ログ管理設定
7. 環境変数設定

## 注意事項
- セキュリティを最優先に考慮
- パフォーマンスとセキュリティのバランス
- ローカル環境での十分なテストを実施
- シークレット情報の適切な管理

## 次のタスク
Task 11: デプロイメントドキュメント作成