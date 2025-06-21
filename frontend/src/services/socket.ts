import io from 'socket.io-client';
import type { SocketEvents, SocketEventName } from '../types/socket';

export class SocketService {
  private socket: any | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(url: string): void {
    if (this.socket?.connected) {
      console.warn('Socket already connected');
      return;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.setupBaseEventListeners();
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  joinRoom(roomId: string, username: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.emit('join-room', { roomId, username });
  }

  leaveRoom(roomId: string): void {
    if (!this.socket) {
      return;
    }

    this.emit('leave-room', { roomId });
  }

  emit<K extends SocketEventName>(
    event: K,
    data: Parameters<SocketEvents[K]>[0]
  ): void {
    if (!this.socket) {
      console.error(`Cannot emit ${event}: Socket not connected`);
      return;
    }

    this.socket.emit(event, data);
  }

  on<K extends SocketEventName>(
    event: K,
    callback: SocketEvents[K]
  ): void {
    if (!this.socket) {
      console.error(`Cannot listen to ${event}: Socket not connected`);
      return;
    }

    this.socket.on(event, callback as any);
  }

  off<K extends SocketEventName>(
    event: K,
    callback?: SocketEvents[K]
  ): void {
    if (!this.socket) {
      return;
    }

    if (callback) {
      this.socket.off(event, callback as any);
    } else {
      this.socket.off(event);
    }
  }

  private setupBaseEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // サーバーからの切断
        this.handleServerDisconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error.message);
      this.handleConnectionError();
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  private handleServerDisconnect(): void {
    // サーバーから切断された場合の処理
    this.reconnectAttempts = 0;
  }

  private handleConnectionError(): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      // ここでユーザーに通知するイベントを発行できる
    }
  }
}

// シングルトンインスタンス
export const socketService = new SocketService();