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