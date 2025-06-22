import { io } from 'socket.io-client';

console.log('Starting WebSocket client test...');

const socket = io('http://localhost:3002', {
  transports: ['websocket'],
  autoConnect: true,
  timeout: 5000
});

// 接続イベント
socket.on('connect', () => {
  console.log('✅ Connected to server:', socket.id);
  
  // ルームに参加をテスト
  const roomId = 'test-room-123';
  console.log(`📡 Joining room: ${roomId}`);
  socket.emit('join-room', roomId);
});

// 切断イベント
socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

// エラーイベント
socket.on('connect_error', (error) => {
  console.log('🔥 Connection error:', error.message);
});

// カスタムイベントリスナー
socket.on('room-user-change', (data) => {
  console.log('👥 Room users changed:', data);
});

socket.on('new-user', (data) => {
  console.log('👤 New user joined:', data);
});

socket.on('user-left', (data) => {
  console.log('👋 User left:', data);
});

// サーバーからの任意のメッセージをキャッチ
socket.onAny((eventName, ...args) => {
  console.log(`📨 Event received: ${eventName}`, args);
});

// テスト用メッセージ送信
setTimeout(() => {
  if (socket.connected) {
    console.log('📤 Sending test message...');
    socket.emit('test-message', { message: 'Hello from client' });
  }
}, 2000);

// 10秒後に切断
setTimeout(() => {
  console.log('🔌 Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);