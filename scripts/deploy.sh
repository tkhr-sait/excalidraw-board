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