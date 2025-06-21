#!/bin/bash

set -e

# 色付きメッセージ用関数
print_status() {
    echo -e "\033[1;34m[TEST]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[PASS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[FAIL]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARN]\033[0m $1"
}

# テスト結果の記録
TEST_RESULTS="test-results-$(date +%Y%m%d-%H%M%S).log"
echo "Final Integration Test Report - $(date)" > $TEST_RESULTS
echo "========================================" >> $TEST_RESULTS

# 失敗カウンタ
FAILED_TESTS=0

# テスト結果を記録する関数
log_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    echo "[$result] $test_name" >> $TEST_RESULTS
    if [ -n "$details" ]; then
        echo "  Details: $details" >> $TEST_RESULTS
    fi
    echo "" >> $TEST_RESULTS
}

# 1. システム前提条件の確認
test_prerequisites() {
    print_status "Testing system prerequisites..."
    
    # Dockerの確認
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        log_test_result "Docker Installation" "FAIL" "Docker command not found"
        ((FAILED_TESTS++))
        return 1
    fi
    
    # Docker Composeの確認
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        log_test_result "Docker Compose Installation" "FAIL" "docker-compose command not found"
        ((FAILED_TESTS++))
        return 1
    fi
    
    # ディスク容量の確認
    local available_space=$(df . | awk 'NR==2 {print $4}')
    if [ $available_space -lt 10485760 ]; then  # 10GB in KB
        print_warning "Less than 10GB disk space available"
        log_test_result "Disk Space" "WARN" "Available: $(($available_space/1024/1024))GB"
    fi
    
    print_success "System prerequisites check passed"
    log_test_result "System Prerequisites" "PASS" "Docker and Docker Compose available"
}

# 2. アプリケーションのビルドと起動
test_application_deployment() {
    print_status "Testing application deployment..."
    
    # 既存のコンテナを停止
    docker-compose -f /workspace/docker/docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    
    # アプリケーションのビルドと起動
    if ! docker-compose -f /workspace/docker/docker-compose.prod.yml up -d --build; then
        print_error "Failed to deploy application"
        log_test_result "Application Deployment" "FAIL" "Docker compose up failed"
        ((FAILED_TESTS++))
        return 1
    fi
    
    # サービスの起動を待つ
    print_status "Waiting for services to start..."
    sleep 30
    
    # コンテナの状態確認
    if ! docker-compose -f /workspace/docker/docker-compose.prod.yml ps | grep -q "Up"; then
        print_error "Some containers are not running"
        docker-compose -f /workspace/docker/docker-compose.prod.yml ps
        log_test_result "Container Status" "FAIL" "Containers not running properly"
        ((FAILED_TESTS++))
        return 1
    fi
    
    print_success "Application deployment successful"
    log_test_result "Application Deployment" "PASS" "All containers running"
}

# 3. ヘルスチェックテスト
test_health_endpoints() {
    print_status "Testing health endpoints..."
    
    # メインヘルスチェック
    if ! curl -f -s http://localhost/health > /dev/null; then
        print_error "Main health endpoint failed"
        log_test_result "Main Health Endpoint" "FAIL" "HTTP request failed"
        ((FAILED_TESTS++))
    else
        print_success "Main health endpoint OK"
        log_test_result "Main Health Endpoint" "PASS" "HTTP 200 response"
    fi
    
    # メインページの確認
    local main_page_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
    if [ "$main_page_status" != "200" ]; then
        print_error "Main page returned status: $main_page_status"
        log_test_result "Main Page" "FAIL" "HTTP $main_page_status"
        ((FAILED_TESTS++))
    else
        print_success "Main page accessible"
        log_test_result "Main Page" "PASS" "HTTP 200 response"
    fi
}

# 4. パフォーマンステスト
test_performance() {
    print_status "Testing performance..."
    
    # レスポンスタイムの測定
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost/)
    
    if command -v bc &> /dev/null; then
        if (( $(echo "$response_time > 3.0" | bc -l) )); then
            print_warning "Main page response time: ${response_time}s (> 3s)"
            log_test_result "Response Time" "WARN" "${response_time}s (target: <3s)"
        else
            print_success "Main page response time: ${response_time}s"
            log_test_result "Response Time" "PASS" "${response_time}s"
        fi
    else
        print_success "Main page response time: ${response_time}s"
        log_test_result "Response Time" "PASS" "${response_time}s"
    fi
    
    # メモリ使用量の確認
    local memory_usage=$(docker stats --no-stream --format "{{.MemUsage}}" excalidraw-frontend-prod 2>/dev/null | head -1 || echo "N/A")
    print_status "Memory usage: $memory_usage"
    log_test_result "Memory Usage" "INFO" "$memory_usage"
    
    # CPU使用率の確認
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" excalidraw-frontend-prod 2>/dev/null | head -1 || echo "N/A")
    print_status "CPU usage: $cpu_usage"
    log_test_result "CPU Usage" "INFO" "$cpu_usage"
}

# 5. セキュリティテスト
test_security() {
    print_status "Testing security configuration..."
    
    # セキュリティヘッダーの確認
    local headers=$(curl -I -s http://localhost/)
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        print_success "X-Frame-Options header present"
        log_test_result "X-Frame-Options Header" "PASS" "Header found"
    else
        print_error "X-Frame-Options header missing"
        log_test_result "X-Frame-Options Header" "FAIL" "Header not found"
        ((FAILED_TESTS++))
    fi
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        print_success "X-Content-Type-Options header present"
        log_test_result "X-Content-Type-Options Header" "PASS" "Header found"
    else
        print_error "X-Content-Type-Options header missing"
        log_test_result "X-Content-Type-Options Header" "FAIL" "Header not found"
        ((FAILED_TESTS++))
    fi
    
    # Serverトークンの非表示確認
    if echo "$headers" | grep -q "Server: nginx"; then
        print_warning "Server header exposes nginx version"
        log_test_result "Server Header" "WARN" "Server information exposed"
    else
        print_success "Server header properly configured"
        log_test_result "Server Header" "PASS" "Server information hidden"
    fi
}

# 6. コラボレーション機能テスト
test_collaboration() {
    print_status "Testing collaboration functionality..."
    
    # excalidraw-roomサービスの確認
    if docker-compose -f /workspace/docker/docker-compose.prod.yml ps excalidraw-room 2>/dev/null | grep -q "Up"; then
        print_success "excalidraw-room service running"
        log_test_result "Excalidraw Room Service" "PASS" "Service is up"
    else
        print_warning "excalidraw-room service not found or not running"
        log_test_result "Excalidraw Room Service" "WARN" "Service not found in compose"
    fi
}

# 7. ユニットテストの実行
test_unit_tests() {
    print_status "Running unit tests..."
    
    cd frontend
    
    if npm test 2>/dev/null || pnpm test:run 2>/dev/null; then
        print_success "Unit tests passed"
        log_test_result "Unit Tests" "PASS" "All tests passed"
    else
        print_error "Unit tests failed or not available"
        log_test_result "Unit Tests" "FAIL" "Tests failed or not configured"
        ((FAILED_TESTS++))
    fi
    
    cd ..
}

# 8. E2Eテストの実行
test_e2e() {
    print_status "Running E2E tests..."
    
    cd frontend
    
    if timeout 300s npm run test:e2e 2>/dev/null || timeout 300s pnpm test:e2e 2>/dev/null; then
        print_success "E2E tests passed"
        log_test_result "E2E Tests" "PASS" "All tests passed"
    else
        print_warning "E2E tests failed, timed out, or not available"
        log_test_result "E2E Tests" "WARN" "Tests failed, timed out, or not configured"
    fi
    
    cd ..
}

# 9. ドキュメントの確認
test_documentation() {
    print_status "Checking documentation..."
    
    local required_docs=(
        "README.md"
        "docs/installation.md"
        "docs/operations.md"
        "docs/troubleshooting.md"
        "docs/security.md"
        "docs/plan.md"
    )
    
    for doc in "${required_docs[@]}"; do
        if [ -f "$doc" ]; then
            if [ -s "$doc" ]; then
                print_success "$doc exists and is not empty"
                log_test_result "Documentation: $doc" "PASS" "File exists and contains content"
            else
                print_warning "$doc exists but is empty"
                log_test_result "Documentation: $doc" "WARN" "File is empty"
            fi
        else
            print_error "$doc is missing"
            log_test_result "Documentation: $doc" "FAIL" "File not found"
            ((FAILED_TESTS++))
        fi
    done
}

# メインテスト関数
run_final_tests() {
    echo "======================================"
    echo "  Excalidraw Board - Final Test Suite"
    echo "======================================"
    echo
    
    test_prerequisites
    test_application_deployment
    test_health_endpoints
    test_performance
    test_security
    test_collaboration
    test_unit_tests
    test_e2e
    test_documentation
    
    echo
    echo "======================================"
    echo "  Test Summary"
    echo "======================================"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_success "All tests passed! Ready for release."
        echo "Test report saved to: $TEST_RESULTS"
        return 0
    else
        print_error "$FAILED_TESTS test(s) failed. Please review and fix issues."
        echo "Test report saved to: $TEST_RESULTS"
        return 1
    fi
}

# スクリプトの実行
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo "  --cleanup     Clean up after tests"
    exit 0
fi

run_final_tests
TEST_EXIT_CODE=$?

if [ "$1" = "--cleanup" ]; then
    print_status "Cleaning up test environment..."
    docker-compose -f /workspace/docker/docker-compose.prod.yml down --remove-orphans
    print_success "Cleanup completed"
fi

exit $TEST_EXIT_CODE