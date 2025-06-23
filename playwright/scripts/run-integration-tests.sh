#!/bin/bash
# playwright/scripts/run-integration-tests.sh

set -e

echo "=== Integration Tests ==="

# Docker Compose環境の起動
echo "Starting Docker Compose environment..."
cd ..
docker-compose down
docker-compose up -d --build

# サービスの起動待機
echo "Waiting for services to be ready..."
sleep 20

# ヘルスチェック
echo "Checking service health..."
curl -f http://localhost || { echo "Frontend not responding"; exit 1; }
nc -zv localhost 3002 || { echo "WebSocket server not responding"; exit 1; }

# 統合テストの実行
echo "Running integration tests..."
cd playwright
npm run test:integration

# テスト結果の保存
TEST_EXIT_CODE=$?

# クリーンアップ
echo "Cleaning up..."
cd ..
docker-compose down

exit $TEST_EXIT_CODE