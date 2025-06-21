# Task 12: 最終動作確認とリリース準備

## 概要
すべてのタスクが完了した後、最終的な統合テスト、パフォーマンステスト、セキュリティテストを実施し、リリース準備を行う。

## 目的
- 全機能の統合テスト
- 本番環境でのパフォーマンス確認
- セキュリティテストの実施
- リリース成果物の準備

## 前提条件
- Task 01-11がすべて完了していること
- 本番環境が構築されていること

## 作業内容

### 1. 最終統合テストスクリプト
`scripts/final-test.sh`:
```bash
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
    docker-compose -f docker/docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    
    # アプリケーションのビルドと起動
    if ! docker-compose -f docker/docker-compose.prod.yml up -d --build; then
        print_error "Failed to deploy application"
        log_test_result "Application Deployment" "FAIL" "Docker compose up failed"
        ((FAILED_TESTS++))
        return 1
    fi
    
    # サービスの起動を待つ
    print_status "Waiting for services to start..."
    sleep 30
    
    # コンテナの状態確認
    if ! docker-compose -f docker/docker-compose.prod.yml ps | grep -q "Up"; then
        print_error "Some containers are not running"
        docker-compose -f docker/docker-compose.prod.yml ps
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
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time > 3.0" | bc -l) )); then
        print_warning "Main page response time: ${response_time}s (> 3s)"
        log_test_result "Response Time" "WARN" "${response_time}s (target: <3s)"
    else
        print_success "Main page response time: ${response_time}s"
        log_test_result "Response Time" "PASS" "${response_time}s"
    fi
    
    # メモリ使用量の確認
    local memory_usage=$(docker stats --no-stream --format "{{.MemUsage}}" excalidraw-frontend-prod | head -1)
    print_status "Memory usage: $memory_usage"
    log_test_result "Memory Usage" "INFO" "$memory_usage"
    
    # CPU使用率の確認
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" excalidraw-frontend-prod | head -1)
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
    
    # WebSocketエンドポイントの確認
    if command -v wscat &> /dev/null; then
        if timeout 5s wscat -c ws://localhost/socket.io/ > /dev/null 2>&1; then
            print_success "WebSocket connection successful"
            log_test_result "WebSocket Connection" "PASS" "Connection established"
        else
            print_error "WebSocket connection failed"
            log_test_result "WebSocket Connection" "FAIL" "Connection timeout or error"
            ((FAILED_TESTS++))
        fi
    else
        print_warning "wscat not available, skipping WebSocket test"
        log_test_result "WebSocket Connection" "SKIP" "wscat not installed"
    fi
    
    # excalidraw-roomサービスの確認
    if docker-compose -f docker/docker-compose.prod.yml ps excalidraw-room | grep -q "Up"; then
        print_success "excalidraw-room service running"
        log_test_result "Excalidraw Room Service" "PASS" "Service is up"
    else
        print_error "excalidraw-room service not running"
        log_test_result "Excalidraw Room Service" "FAIL" "Service is down"
        ((FAILED_TESTS++))
    fi
}

# 7. ユニットテストの実行
test_unit_tests() {
    print_status "Running unit tests..."
    
    cd frontend
    
    if pnpm test:run > /dev/null 2>&1; then
        print_success "Unit tests passed"
        log_test_result "Unit Tests" "PASS" "All tests passed"
    else
        print_error "Unit tests failed"
        log_test_result "Unit Tests" "FAIL" "Some tests failed"
        ((FAILED_TESTS++))
    fi
    
    cd ..
}

# 8. E2Eテストの実行
test_e2e() {
    print_status "Running E2E tests..."
    
    cd frontend
    
    if timeout 300s pnpm test:e2e > /dev/null 2>&1; then
        print_success "E2E tests passed"
        log_test_result "E2E Tests" "PASS" "All tests passed"
    else
        print_error "E2E tests failed or timed out"
        log_test_result "E2E Tests" "FAIL" "Tests failed or timed out"
        ((FAILED_TESTS++))
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
    docker-compose -f docker/docker-compose.prod.yml down --remove-orphans
    print_success "Cleanup completed"
fi

exit $TEST_EXIT_CODE
```

### 2. リリースノートの作成
`RELEASE.md`:
```markdown
# Excalidraw Board v1.0.0 Release Notes

## リリース日
2024年XX月XX日

## 概要
Excalidraw Board v1.0.0 は、セルフホスティング可能なリアルタイムコラボレーションホワイトボードアプリケーションの最初の安定版リリースです。

## 主要機能

### ✨ コア機能
- **リアルタイムコラボレーション**: 複数ユーザーが同時に描画できる
- **豊富な描画ツール**: 長方形、円、矢印、テキストなど
- **ルームベースのコラボレーション**: 簡単なルームIDで参加可能
- **ポインター共有**: 他のユーザーのマウス位置をリアルタイム表示
- **ローカルストレージ**: ブラウザへの自動保存

### 🔒 セルフホスティング
- **完全オフライン動作**: 外部サービスに依存しない
- **Dockerコンテナベース**: 簡単なデプロイと移植性
- **ローカルネットワーク対応**: 社内ネットワークでの安全な利用
- **HTTP/HTTPS対応**: SSL証明書の設定可能

### 🚀 運用機能
- **ヘルスチェックエンドポイント**: システム状態の監視
- **ログ出力**: 結構化されたログでトラブルシューティングを支援
- **パフォーマンスモニタリング**: CPU、メモリ、ネットワークの使用量確認
- **自動スケーリング**: 負荷に応じたスロットリング調整

### 🔐 セキュリティ
- **セキュリティヘッダー**: XSS、CSRFなどの攻撃を防止
- **IPアドレス制限**: 特定ネットワークからのみアクセス許可
- **非特権ユーザー実行**: コンテナ内でのroot権限不要
- **CSPポリシー**: Content Security Policyによるセキュリティ強化

### 🔧 開発者向け機能
- **包括的なテストスイート**: ユニットテスト、E2Eテスト
- **TypeScriptサポート**: 型安全な開発環境
- **ホットリロード**: 開発時の迅速なフィードバックループ
- **ESLintとPrettier**: コード品質の維持

## 技術仕様

### システム要件
- **最小**: 2コアCPU、4GB RAM、10GBストレージ
- **推奨**: 4コアCPU、8GB RAM、20GBストレージ
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Docker対応環境

### 技術スタック
- **フロントエンド**: React 18, TypeScript 5, Vite 4
- **バックエンド**: excalidraw-room (公式), Node.js, Socket.IO
- **Webサーバー**: Nginx 1.24 (Alpine)
- **コンテナ**: Docker 20.10+, Docker Compose 2.0+
- **テスト**: Vitest, Playwright, Jest DOM

### パフォーマンス
- **初期読み込み**: < 3秒
- **描画応答性**: < 100ms
- **同期遅延**: < 200ms
- **メモリ使用量**: < 100MB (通常時)
- **同時接続数**: 50ユーザーまでテスト済み

## インストール方法

### クイックスタート
```bash
# リポジトリのクローン
git clone https://github.com/your-org/excalidraw-board.git
cd excalidraw-board

# 本番環境用デプロイ
./scripts/deploy.sh

# アクセス確認
curl http://localhost/health
```

### 詳細なインストール手順
[インストールガイド](docs/installation.md)を参照してください。

## 使用方法

### コラボレーションセッションの開始
1. ブラウザで http://localhost にアクセス
2. 「Join Room」ボタンをクリック
3. ルームIDとユーザー名を入力
4. 他のユーザーと同じルームIDで参加

### 描画機能
- **選択ツール**: 要素の選択、移動、サイズ変更
- **図形ツール**: 長方形、円、ダイヤモンド
- **線ツール**: 直線、矢印、手描き線
- **テキストツール**: ラベル、コメントの追加

## 既知の制限事項

1. **ブラウザ互換性**
   - IE 11以下はサポート対象外
   - Safari 14以下で一部機能に制限あり

2. **パフォーマンス**
   - 1000個以上の要素でパフォーマンス低下の可能性
   - 100人以上の同時接続は未テスト

3. **機能制限**
   - ファイルアップロード機能は未実装
   - データの永続化はブラウザのLocalStorageのみ
   - ユーザー認証機能は未実装

## ロードマップ

### v1.1.0 (予定)
- ファイルアップロード機能
- データベース連携による永続化
- ユーザー認証機能

### v1.2.0 (予定)
- モバイルアプリ対応
- リアルタイム音声チャット
- プレゼンテーションモード

## サポート

- **ドキュメント**: [docs/](docs/) ディレクトリ参照
- **Issue報告**: [GitHub Issues](https://github.com/your-org/excalidraw-board/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/your-org/excalidraw-board/discussions)
- **メール**: support@your-org.com

## 認謝

Excalidraw Boardは以下のオープンソースプロジェクトをベースにしています:

- [Excalidraw](https://github.com/excalidraw/excalidraw) - MIT License
- [excalidraw-room](https://github.com/excalidraw/excalidraw-room) - MIT License

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## チェンジログ

### v1.0.0 (2024-XX-XX)
- 🎉 初回リリース
- ✨ リアルタイムコラボレーション機能
- 🔒 セルフホスティング対応
- 🚀 Dockerコンテナベースのデプロイ
- 🔐 セキュリティ強化機能
- 🔧 包括的なテストスイート
- 📚 詳細なドキュメント
```

### 3. ライセンスファイル
`LICENSE`:
```
MIT License

Copyright (c) 2024 [Your Organization Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 4. 貢献ガイド
`CONTRIBUTING.md`:
```markdown
# 貢献ガイド

Excalidraw Boardプロジェクトへの貢献を歓迎します！

## 貢献の方法

### 1. Issueの報告
- バグ報告
- 機能要望
- ドキュメントの改善提案

### 2. Pull Request
1. フォークしてブランチを作成
2. 機能を実装またはバグを修正
3. テストを追加または更新
4. ドキュメントを更新
5. Pull Requestを作成

## 開発環境のセットアップ

```bash
# リポジトリのフォークとクローン
git clone https://github.com/your-username/excalidraw-board.git
cd excalidraw-board

# 開発環境の起動
pnpm docker:dev

# テストの実行
cd frontend
pnpm test
pnpm test:e2e
```

## コードスタイル

- TypeScriptを使用
- ESLintとPrettierのルールに従う
- コメントは日本語で記述
- コミットメッセージは英語で記述

## テスト

- 新機能には必ずテストを追加
- ユニットテストとE2Eテストの両方を考慮
- カバレッジは80%以上を維持

## コミットメッセージ

```
type(scope): description

body

footer
```

例:
```
feat(collab): add real-time pointer sharing

Implement pointer position synchronization between users
with throttling to optimize network usage.

Closes #123
```

## ライセンス

貢献するコードはMITライセンスの下で公開されます。
```

### 5. パフォーマンスベンチマークスクリプト
`scripts/benchmark.sh`:
```bash
#!/bin/bash

set -e

print_status() {
    echo -e "\033[1;34m[BENCHMARK]\033[0m $1"
}

print_result() {
    echo -e "\033[1;32m[RESULT]\033[0m $1"
}

# パフォーマンスベンチマーク
run_performance_benchmark() {
    print_status "Starting performance benchmark..."
    
    # アプリケーションが起動していることを確認
    if ! curl -f -s http://localhost/health > /dev/null; then
        echo "Error: Application is not running"
        exit 1
    fi
    
    # 1. ページ読み込みパフォーマンス
    print_status "Testing page load performance..."
    local load_times=()
    for i in {1..10}; do
        local time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost/)
        load_times+=($time)
        echo "Load test $i: ${time}s"
    done
    
    # 平均を計算
    local sum=0
    for time in "${load_times[@]}"; do
        sum=$(echo "$sum + $time" | bc)
    done
    local avg=$(echo "scale=3; $sum / ${#load_times[@]}" | bc)
    print_result "Average page load time: ${avg}s"
    
    # 2. コンカレントユーザーテスト
    print_status "Testing concurrent users..."
    
    # Apache Benchで同時アクセステスト
    if command -v ab &> /dev/null; then
        ab -n 100 -c 10 http://localhost/ > ab_results.txt
        local requests_per_sec=$(grep "Requests per second" ab_results.txt | awk '{print $4}')
        local time_per_request=$(grep "Time per request" ab_results.txt | head -1 | awk '{print $4}')
        
        print_result "Requests per second: $requests_per_sec"
        print_result "Time per request: ${time_per_request}ms"
        
        rm -f ab_results.txt
    else
        print_status "Apache Bench not available, skipping concurrent test"
    fi
    
    # 3. メモリ使用量テスト
    print_status "Testing memory usage..."
    local memory_usage=$(docker stats --no-stream --format "{{.MemUsage}}" excalidraw-frontend-prod)
    print_result "Memory usage: $memory_usage"
    
    # 4. CPU使用率テスト
    print_status "Testing CPU usage..."
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" excalidraw-frontend-prod)
    print_result "CPU usage: $cpu_usage"
}

run_performance_benchmark
```

## テスト要件

### 統合テスト
- [ ] すべての機能が本番環境で正常動作する
- [ ] パフォーマンス目標を満たしている
- [ ] セキュリティ設定が有効になっている
- [ ] ドキュメントが最新の実装と一致している

### パフォーマンス目標
- [ ] ページ読み込み: 3秒以下
- [ ] 描画応答性: 100ms以下
- [ ] 同期遅延: 200ms以下
- [ ] メモリ使用量: 100MB以下
- [ ] 50人同時接続で安定動作

### リリース準備
- [ ] すべてのテストがパスする
- [ ] ビルドがエラーなく完了する
- [ ] パフォーマンスベンチマークが基準を満たす
- [ ] セキュリティチェックが完了している

## 成果物

1. 統合テストスクリプト
2. リリースノート
3. ライセンスファイル
4. 貢献ガイド
5. パフォーマンスベンチマークスクリプト
6. リリース成果物のパッケージ

## 注意事項

- 本番環境での実際のテストを必ず実施
- パフォーマンス数値は統計的に有意であることを確認
- セキュリティチェックは必ず第三者による確認を実施
- リリース後のサポート体制を整備

## 次のタスク
これですべてのタスクが完了しました。リリース準備が整いました！