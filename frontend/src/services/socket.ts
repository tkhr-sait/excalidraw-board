import io from 'socket.io-client';
import type { SocketEvents, SocketEventName, SocketUpdateData } from '../types/socket';
import { WS_EVENTS } from '../types/socket';
import { EncryptionUtils } from '../utils/encryption';

export class SocketService {
  public socket: any | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private roomId: string | null = null;
  private roomKey: string | null = null;
  private socketInitialized: boolean = false;
  private broadcastedElementVersions: Map<string, number> = new Map();
  private currentUrl: string | null = null;
  private fallbackUrls: string[] = [];
  private connectionRetryCount = 0;

  connect(url: string, fallbackUrls: string[] = []): void {
    if (this.socket?.connected) {
      console.warn('Socket already connected');
      return;
    }

    this.currentUrl = url;
    this.fallbackUrls = fallbackUrls;
    this.connectionRetryCount = 0;

    console.log('Connecting to WebSocket:', url);
    if (fallbackUrls.length > 0) {
      console.log('Fallback URLs available:', fallbackUrls);
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Let Socket.IO handle reconnection
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000,
      forceNew: false,
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
    
    this.roomId = null;
    this.roomKey = null;
    this.socketInitialized = false;
    this.broadcastedElementVersions.clear();
    this.currentUrl = null;
    this.fallbackUrls = [];
    this.connectionRetryCount = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  joinRoom(roomId: string, username: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.roomId = roomId;
    this.socket.emit('join-room', roomId);
    
    // Save username to localStorage when joining
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('excalidraw-collab-username', username);
    }
  }

  leaveRoom(): void {
    if (!this.socket) {
      return;
    }

    // Excalidraw doesn't use leave-room, it relies on disconnecting event
    this.roomId = null;
    this.roomKey = null;
    this.socketInitialized = false;
    this.broadcastedElementVersions.clear();
  }

  updateUsername(roomId: string, username: string): void {
    if (!this.socket) {
      console.error('Cannot update username: Socket not connected');
      return;
    }

    // Update local room info
    this.roomId = roomId;
    
    // Update username in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('excalidraw-collab-username', username);
    }

    // Emit username update to server (if backend supports it)
    this.socket.emit('update-username', { roomId, username });
    console.log('Username update sent to server:', { roomId, username });
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
      console.log('Socket connected successfully', {
        id: this.socket?.id,
        transport: this.socket?.io?.engine?.transport?.name,
        url: this.socket?.io?.uri
      });
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
      console.warn('Connection error:', error.message);
      console.log('Connection details:', {
        url: this.currentUrl,
        transport: this.socket?.io?.engine?.transport?.name,
        fallbacksAvailable: this.fallbackUrls.length
      });
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
    this.connectionRetryCount++;
    
    console.log(`Connection attempt ${this.connectionRetryCount} failed for ${this.currentUrl}`);
    
    // Try fallback URLs after initial attempts
    if (this.reconnectAttempts >= 3 && this.fallbackUrls.length > 0) {
      console.log('Trying fallback URLs...');
      this.tryFallbackUrls();
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Max reconnection attempts reached (${this.maxReconnectAttempts}). Will continue trying with Socket.IO auto-reconnect.`);
      // Reset counter to allow continued attempts
      this.reconnectAttempts = 0;
    }
  }

  private tryFallbackUrls(): void {
    if (this.fallbackUrls.length === 0) {
      return;
    }

    // Try each fallback URL
    const nextUrl = this.fallbackUrls.shift();
    if (nextUrl) {
      console.log(`Trying fallback URL: ${nextUrl}`);
      
      // Disconnect current socket
      if (this.socket) {
        this.socket.disconnect();
      }
      
      // Try connecting to fallback URL
      this.currentUrl = nextUrl;
      this.reconnectAttempts = 0;
      
      this.socket = io(nextUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3, // Shorter attempts for fallbacks
        reconnectionDelay: 1000,
        reconnectionDelayMax: 3000,
        randomizationFactor: 0.5,
        timeout: 5000, // Shorter timeout for fallbacks
        forceNew: true,
      });

      this.setupBaseEventListeners();
    }
  }

  async broadcastEncryptedData(
    data: SocketUpdateData,
    volatile: boolean = false,
    roomId?: string
  ): Promise<void> {
    if (!this.isOpen() || !this.roomKey) {
      console.error('Cannot broadcast: Socket not initialized or no room key');
      return;
    }

    try {
      const json = JSON.stringify(data);
      const encoded = new TextEncoder().encode(json);
      const { encryptedBuffer, iv } = await EncryptionUtils.encryptData(this.roomKey, encoded);

      this.socket?.emit(
        volatile ? WS_EVENTS.SERVER_VOLATILE : WS_EVENTS.SERVER,
        roomId ?? this.roomId,
        encryptedBuffer,
        iv
      );
    } catch (error) {
      console.error('Failed to broadcast encrypted data:', error);
    }
  }

  async generateRoomKey(): Promise<string> {
    return await EncryptionUtils.generateKey();
  }

  setRoomKey(key: string): void {
    this.roomKey = key;
  }

  isOpen(): boolean {
    return !!(
      this.socketInitialized &&
      this.socket &&
      this.roomId &&
      this.roomKey
    );
  }

  markSocketInitialized(): void {
    this.socketInitialized = true;
  }

  getBroadcastedElementVersion(elementId: string): number | undefined {
    return this.broadcastedElementVersions.get(elementId);
  }

  setBroadcastedElementVersion(elementId: string, version: number): void {
    this.broadcastedElementVersions.set(elementId, version);
  }

  clearBroadcastedElements(): void {
    this.broadcastedElementVersions.clear();
  }
}

// シングルトンインスタンス
export const socketService = new SocketService();