import { io, Socket } from 'socket.io-client';

export interface WebSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onRoomUserChange?: (users: string[]) => void;
  onNewUser?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onSceneUpdate?: (elements: any[], appState: any) => void;
  onConnectionError?: (error: Error) => void;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string, roomId: string, callbacks: WebSocketCallbacks = {}) {
    this.roomId = roomId;
    this.callbacks = callbacks;

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      timeout: 5000,
      forceNew: true
    });

    this.setupEventHandlers();
    
    // Join room after connection
    this.socket.on('connect', () => {
      if (this.socket && this.roomId) {
        this.socket.emit('join-room', this.roomId);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomId = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
  }

  sendSceneUpdate(elements: any[], appState: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('scene-update', {
        elements,
        appState,
        roomId: this.roomId,
        timestamp: Date.now()
      });
    }
  }

  sendCursorUpdate(x: number, y: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('cursor-update', {
        x,
        y,
        roomId: this.roomId,
        timestamp: Date.now()
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.callbacks.onDisconnect?.(reason);
      
      // Auto-reconnect logic
      if (reason === 'io server disconnect') {
        // Server disconnected, don't reconnect automatically
        return;
      }
      
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('🔥 WebSocket connection error:', error.message);
      this.callbacks.onConnectionError?.(error);
      this.handleReconnection();
    });

    // Room events
    this.socket.on('init-room', () => {
      console.log('🎯 Room initialized');
    });

    this.socket.on('first-in-room', () => {
      console.log('🥇 First user in room');
    });

    this.socket.on('room-user-change', (users: string[]) => {
      console.log('👥 Room users changed:', users);
      this.callbacks.onRoomUserChange?.(users);
    });

    this.socket.on('new-user', (userId: string) => {
      console.log('👤 New user joined:', userId);
      this.callbacks.onNewUser?.(userId);
    });

    this.socket.on('user-left', (userId: string) => {
      console.log('👋 User left:', userId);
      this.callbacks.onUserLeft?.(userId);
    });

    // Collaboration events
    this.socket.on('scene-update', (data: { elements: any[], appState: any, fromUserId: string }) => {
      console.log('🎨 Scene update received from:', data.fromUserId);
      this.callbacks.onSceneUpdate?.(data.elements, data.appState);
    });

    this.socket.on('cursor-update', (data: { x: number, y: number, fromUserId: string }) => {
      console.log('👆 Cursor update from:', data.fromUserId, data.x, data.y);
      // Handle cursor updates if needed
    });

    // Generic event logger
    this.socket.onAny((eventName: string, ...args: any[]) => {
      if (!['room-user-change', 'scene-update', 'cursor-update'].includes(eventName)) {
        console.log(`📨 WebSocket event: ${eventName}`, args);
      }
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }
}

// Singleton instance
export const websocketService = new WebSocketService();