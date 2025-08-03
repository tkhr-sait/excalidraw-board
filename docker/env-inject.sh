#!/bin/sh

# 実行時環境変数をJavaScriptファイルに注入するスクリプト

ENV_JS="/usr/share/nginx/html/env.js"

echo "Injecting runtime environment variables..."

# env.jsファイルを生成
cat > "$ENV_JS" << EOF
window.ENV = {
  VITE_WEBSOCKET_SERVER_URL: '${VITE_WEBSOCKET_SERVER_URL:-wss://localhost:3002}',
  VITE_DEBUG_WEBSOCKET: '${VITE_DEBUG_WEBSOCKET:-false}',
  VITE_FEATURE_COLLAB_IMAGE: '${VITE_FEATURE_COLLAB_IMAGE:-false}'
};
EOF

echo "Environment variables injected successfully!"
echo "VITE_WEBSOCKET_SERVER_URL: ${VITE_WEBSOCKET_SERVER_URL:-wss://localhost:3002}"
echo "VITE_DEBUG_WEBSOCKET: ${VITE_DEBUG_WEBSOCKET:-false}"
echo "VITE_FEATURE_COLLAB_IMAGE: ${VITE_FEATURE_COLLAB_IMAGE:-false}"
