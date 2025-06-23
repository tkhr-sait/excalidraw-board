# Task 03: WebSocket接続の実装

## 概要
excalidraw-roomとのWebSocket接続を確立し、基本的な通信機能を実装する。

## 前提条件
- Task 02（基本的なExcalidrawコンポーネント）が完了していること
- excalidraw-roomがDockerで起動可能であること

## 作業内容

### 1. WebSocketサービスのテスト作成
```typescript
// frontend/src/services/__tests__/websocket.test.ts
import { WebSocketService } from '../websocket';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should connect to websocket server', async () => {
    const connected = await service.connect('ws://localhost:3002');
    expect(connected).toBe(true);
  });

  it('should handle connection errors', async () => {
    const connected = await service.connect('ws://invalid-url');
    expect(connected).toBe(false);
  });

  it('should send and receive messages', (done) => {
    service.onMessage((data) => {
      expect(data.type).toBeDefined();
      done();
    });

    service.connect('ws://localhost:3002').then(() => {
      service.send({ type: 'test', payload: {} });
    });
  });
});
```

### 2. WebSocketサービスの実装
```typescript
// frontend/src/services/websocket.ts
export interface CollaborationMessage {
  type: string;
  payload: any;
  userId?: string;
  timestamp?: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Array<(data: CollaborationMessage) => void> = [];
  private connectionPromise: Promise<boolean> | null = null;

  async connect(url: string): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    this.connectionPromise = new Promise((resolve) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          resolve(true);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messageHandlers.forEach(handler => handler(data));
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.ws = null;
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        resolve(false);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: CollaborationMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  onMessage(handler: (data: CollaborationMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  offMessage(handler: (data: CollaborationMessage) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

### 3. WebSocket Hookの作成
```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { WebSocketService, CollaborationMessage } from '../services/websocket';

export const useWebSocket = (url: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<CollaborationMessage | null>(null);
  const wsService = useRef<WebSocketService>(new WebSocketService());

  useEffect(() => {
    if (!url) return;

    const connect = async () => {
      const connected = await wsService.current.connect(url);
      setIsConnected(connected);
    };

    const messageHandler = (data: CollaborationMessage) => {
      setLastMessage(data);
    };

    wsService.current.onMessage(messageHandler);
    connect();

    return () => {
      wsService.current.offMessage(messageHandler);
      wsService.current.disconnect();
    };
  }, [url]);

  const sendMessage = (message: CollaborationMessage) => {
    wsService.current.send(message);
  };

  return {
    isConnected,
    sendMessage,
    lastMessage,
    service: wsService.current
  };
};
```

### 4. 環境変数の設定
```typescript
// frontend/src/config/environment.ts
export const config = {
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3002',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
```

```bash
# frontend/.env.development
VITE_WEBSOCKET_URL=ws://localhost:3002
```

### 5. WebSocket接続状態の表示
```typescript
// frontend/src/components/ConnectionStatus.tsx
import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <div 
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        padding: '5px 10px',
        borderRadius: 5,
        backgroundColor: isConnected ? '#4caf50' : '#f44336',
        color: 'white',
        fontSize: 12,
        zIndex: 1000,
      }}
    >
      {isConnected ? '接続中' : '未接続'}
    </div>
  );
};
```

## 検証項目
- [ ] WebSocketサービスのテストが通ること
- [ ] excalidraw-roomへの接続が確立できること
- [ ] メッセージの送受信が正常に動作すること
- [ ] 接続状態が画面に表示されること
- [ ] 接続エラーが適切にハンドリングされること

## 成果物
- frontend/src/services/websocket.ts
- frontend/src/services/__tests__/websocket.test.ts
- frontend/src/hooks/useWebSocket.ts
- frontend/src/components/ConnectionStatus.tsx
- frontend/src/config/environment.ts
- frontend/.env.development

## 次のステップ
Task 04: コラボレーション機能の実装