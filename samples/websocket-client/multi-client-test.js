import { io } from 'socket.io-client';

console.log('Starting multi-client WebSocket test...');

const clients = [];
const roomId = 'test-room-multi';

// 3つのクライアントを作成
for (let i = 0; i < 3; i++) {
  const clientId = `client-${i + 1}`;
  const socket = io('http://localhost:3002', {
    transports: ['websocket'],
    autoConnect: true,
    timeout: 5000
  });

  socket.clientId = clientId;
  clients.push(socket);

  // 接続イベント
  socket.on('connect', () => {
    console.log(`✅ ${clientId} connected:`, socket.id);
    
    // ルームに参加
    socket.emit('join-room', roomId);
    console.log(`📡 ${clientId} joining room: ${roomId}`);
  });

  // ルーム関連イベント
  socket.on('room-user-change', (users) => {
    console.log(`👥 ${clientId} sees users in room:`, users);
  });

  socket.on('init-room', () => {
    console.log(`🎯 ${clientId} initialized room`);
  });

  socket.on('first-in-room', () => {
    console.log(`🥇 ${clientId} is first in room`);
  });

  // 他のイベントをログ
  socket.onAny((eventName, ...args) => {
    if (!['room-user-change', 'init-room', 'first-in-room'].includes(eventName)) {
      console.log(`📨 ${clientId} received: ${eventName}`, args);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ ${clientId} disconnected:`, reason);
  });

  socket.on('connect_error', (error) => {
    console.log(`🔥 ${clientId} connection error:`, error.message);
  });
}

// 5秒後にテストメッセージを送信
setTimeout(() => {
  console.log('\n📤 Sending test messages from each client...');
  clients.forEach((socket, index) => {
    if (socket.connected) {
      socket.emit('test-message', { 
        from: socket.clientId, 
        message: `Hello from ${socket.clientId}`,
        timestamp: new Date().toISOString()
      });
    }
  });
}, 5000);

// 10秒後にクライアントを順次切断
setTimeout(() => {
  console.log('\n🔌 Disconnecting clients...');
  clients.forEach((socket, index) => {
    setTimeout(() => {
      console.log(`Disconnecting ${socket.clientId}...`);
      socket.disconnect();
    }, index * 1000);
  });
}, 10000);

// 15秒後にプロセス終了
setTimeout(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}, 15000);