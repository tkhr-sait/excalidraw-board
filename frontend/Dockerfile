FROM node:18-alpine as builder

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci

# ソースコードのコピーとビルド
COPY . .
# ビルド時の環境変数設定
ARG VITE_WEBSOCKET_URL=ws://localhost:3002/socket.io/
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL
RUN npm run build

# 本番用イメージ
FROM nginx:alpine

# Nginxの設定
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]