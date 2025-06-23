export interface CollaborationMessage {
  type: string;
  payload: any;
  userId?: string;
  userName?: string;
  roomId?: string;
  timestamp?: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Array<(data: CollaborationMessage) => void> = [];
  private connectionPromise: Promise<boolean> | null = null;
  private connectionStateHandlers: Array<(connected: boolean) => void> = [];

  async connect(url: string): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    this.connectionPromise = new Promise((resolve) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.connectionStateHandlers.forEach(handler => handler(true));
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
          this.connectionStateHandlers.forEach(handler => handler(false));
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

  onConnectionStateChange(handler: (connected: boolean) => void): void {
    this.connectionStateHandlers.push(handler);
  }

  offConnectionStateChange(handler: (connected: boolean) => void): void {
    this.connectionStateHandlers = this.connectionStateHandlers.filter(h => h !== handler);
  }

  joinRoom(roomId: string, userName: string, userId: string): void {
    this.send({
      type: 'join-room',
      payload: { roomId, userName, userId },
      userId,
      userName,
      roomId,
    });
  }

  leaveRoom(roomId: string, userId: string): void {
    this.send({
      type: 'leave-room',
      payload: { roomId, userId },
      userId,
      roomId,
    });
  }
}