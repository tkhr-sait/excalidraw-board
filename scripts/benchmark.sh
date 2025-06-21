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
        if command -v bc &> /dev/null; then
            sum=$(echo "$sum + $time" | bc)
        else
            # bc がない場合の簡易計算
            sum=$(awk "BEGIN {print $sum + $time}")
        fi
    done
    
    if command -v bc &> /dev/null; then
        local avg=$(echo "scale=3; $sum / ${#load_times[@]}" | bc)
    else
        local avg=$(awk "BEGIN {printf \"%.3f\", $sum / ${#load_times[@]}}")
    fi
    print_result "Average page load time: ${avg}s"
    
    # 2. コンカレントユーザーテスト
    print_status "Testing concurrent users..."
    
    # Apache Benchで同時アクセステスト
    if command -v ab &> /dev/null; then
        ab -n 100 -c 10 http://localhost/ > ab_results.txt 2>&1
        local requests_per_sec=$(grep "Requests per second" ab_results.txt | awk '{print $4}' || echo "N/A")
        local time_per_request=$(grep "Time per request" ab_results.txt | head -1 | awk '{print $4}' || echo "N/A")
        
        print_result "Requests per second: $requests_per_sec"
        print_result "Time per request: ${time_per_request}ms"
        
        rm -f ab_results.txt
    else
        print_status "Apache Bench not available, skipping concurrent test"
        
        # 代替として簡単な並列テスト
        print_status "Running simple concurrent test..."
        for i in {1..5}; do
            (curl -o /dev/null -s -w "Concurrent test $i: %{time_total}s\n" http://localhost/) &
        done
        wait
    fi
    
    # 3. メモリ使用量テスト
    print_status "Testing memory usage..."
    if docker ps --format "{{.Names}}" | grep -q "excalidraw-frontend-prod"; then
        local memory_usage=$(docker stats --no-stream --format "{{.MemUsage}}" excalidraw-frontend-prod 2>/dev/null || echo "N/A")
        print_result "Memory usage: $memory_usage"
    else
        print_status "Frontend container not found, skipping memory test"
    fi
    
    # 4. CPU使用率テスト
    print_status "Testing CPU usage..."
    if docker ps --format "{{.Names}}" | grep -q "excalidraw-frontend-prod"; then
        local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" excalidraw-frontend-prod 2>/dev/null || echo "N/A")
        print_result "CPU usage: $cpu_usage"
    else
        print_status "Frontend container not found, skipping CPU test"
    fi
    
    # 5. 応答性テスト
    print_status "Testing responsiveness..."
    local response_times=()
    for i in {1..5}; do
        local time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost/health)
        response_times+=($time)
        echo "Health check $i: ${time}s"
    done
    
    # 最小、最大、平均応答時間
    local min_time=${response_times[0]}
    local max_time=${response_times[0]}
    local total_time=0
    
    for time in "${response_times[@]}"; do
        if command -v bc &> /dev/null; then
            if (( $(echo "$time < $min_time" | bc -l) )); then
                min_time=$time
            fi
            if (( $(echo "$time > $max_time" | bc -l) )); then
                max_time=$time
            fi
            total_time=$(echo "$total_time + $time" | bc)
        else
            total_time=$(awk "BEGIN {print $total_time + $time}")
        fi
    done
    
    if command -v bc &> /dev/null; then
        local avg_time=$(echo "scale=3; $total_time / ${#response_times[@]}" | bc)
    else
        local avg_time=$(awk "BEGIN {printf \"%.3f\", $total_time / ${#response_times[@]}}")
    fi
    
    print_result "Health check - Min: ${min_time}s, Max: ${max_time}s, Avg: ${avg_time}s"
}

# ベンチマーク結果の評価
evaluate_results() {
    print_status "Evaluating performance against targets..."
    
    # 簡単なパフォーマンス評価
    local main_response=$(curl -o /dev/null -s -w "%{time_total}" http://localhost/)
    
    if command -v bc &> /dev/null; then
        if (( $(echo "$main_response < 3.0" | bc -l) )); then
            print_result "✓ Page load time meets target (<3s): ${main_response}s"
        else
            print_result "⚠ Page load time exceeds target (>3s): ${main_response}s"
        fi
    else
        print_result "Page load time: ${main_response}s (target: <3s)"
    fi
}

# メインベンチマーク実行
main() {
    echo "======================================="
    echo "  Excalidraw Board - Performance Benchmark"
    echo "======================================="
    echo
    
    run_performance_benchmark
    echo
    evaluate_results
    
    echo
    echo "======================================="
    echo "  Benchmark Complete"
    echo "======================================="
    
    print_status "Benchmark completed successfully"
}

# ヘルプメッセージ
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0"
    echo ""
    echo "Performance benchmark script for Excalidraw Board"
    echo ""
    echo "Prerequisites:"
    echo "  - Application must be running on http://localhost"
    echo "  - curl command must be available"
    echo "  - docker command for container stats (optional)"
    echo "  - Apache Bench (ab) for concurrent testing (optional)"
    echo ""
    echo "The script will test:"
    echo "  - Page load performance"
    echo "  - Concurrent user handling"
    echo "  - Resource usage (CPU, Memory)"
    echo "  - API responsiveness"
    echo ""
    exit 0
fi

main