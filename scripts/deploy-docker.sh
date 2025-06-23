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