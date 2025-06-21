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