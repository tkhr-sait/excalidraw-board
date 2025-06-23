import { io, Socket } from 'socket.io-client';

export interface CollaborationMessage {
  type: string;
  payload: any;
  userId?: string;
  userName?: string;
  roomId?: string;
  timestamp?: number;
}

export class SocketIOWebSocketService {
  private socket: Socket | null = null;
  private messageHandlers: Array<(data: CollaborationMessage) => void> = [];
  private connectionStateHandlers: Array<(connected: boolean) => void> = [];
  private currentRoomId: string | null = null;

  async connect(url: string): Promise<boolean> {
    if (this.socket?.connected) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        // Parse the URL to get the base URL without socket.io path
        const baseUrl = url.replace('/socket.io/', '').replace('ws://', 'http://').replace('wss://', 'https://');
        
        this.socket = io(baseUrl, {
          transports: ['websocket', 'polling'],
          upgrade: true,
        });

        this.socket.on('connect', () => {
          console.log('Socket.IO connected');
          this.connectionStateHandlers.forEach(handler => handler(true));
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          resolve(false);
        });

        this.socket.on('disconnect', () => {
          console.log('Socket.IO disconnected');
          this.connectionStateHandlers.forEach(handler => handler(false));
        });

        // Listen for excalidraw-room specific events based on official implementation
        
        // Init room event - server tells client to join room
        this.socket.on('init-room', () => {
          console.log('Socket.IO init-room received');
          if (this.socket && this.currentRoomId) {
            this.socket.emit('join-room', this.currentRoomId);
            console.log('Emitted join-room for:', this.currentRoomId);
          }
        });

        // New user joined the room
        this.socket.on('new-user', (socketId: string) => {
          console.log('Socket.IO new-user received:', socketId);
          this.messageHandlers.forEach(handler => handler({
            type: 'new-user',
            payload: { socketId },
            socketId
          }));
        });

        // Room user list changed
        this.socket.on('room-user-change', (clients: string[]) => {
          console.log('Socket.IO room-user-change received:', clients);
          this.messageHandlers.forEach(handler => handler({
            type: 'room-users',
            payload: { userCount: clients.length, clients },
            userCount: clients.length
          }));
        });

        // Main collaboration event - data from other clients
        this.socket.on('client-broadcast', (encryptedData: any, iv?: any) => {
          console.log('Socket.IO client-broadcast received:', encryptedData);
          
          try {
            // Process the received data - in excalidraw-room, this is usually JSON
            let data = encryptedData;
            if (typeof encryptedData === 'string') {
              try {
                data = JSON.parse(encryptedData);
              } catch (e) {
                console.warn('Failed to parse JSON, using raw data:', e);
                data = encryptedData;
              }
            }
            
            console.log('Processing client-broadcast data:', data);
            
            // Forward the message as-is if it's already a collaboration message
            if (data && data.type) {
              this.messageHandlers.forEach(handler => handler(data));
            } else {
              // Wrap in sync message if it's raw data
              this.messageHandlers.forEach(handler => handler({
                type: 'sync',
                payload: data,
                ...data
              }));
            }
          } catch (error) {
            console.error('Failed to process client-broadcast:', error);
          }
        });

        // First user in room
        this.socket.on('first-in-room', () => {
          console.log('Socket.IO first-in-room received');
          this.messageHandlers.forEach(handler => handler({
            type: 'first-in-room',
            payload: {}
          }));
        });

        // Listen for server-broadcast events (messages from other clients)
        this.socket.on('server-broadcast', (roomId: string, payload: string) => {
          console.log('Socket.IO server-broadcast received from room:', roomId, 'payload length:', payload?.length || 0);
          
          try {
            const data = JSON.parse(payload);
            console.log('Processing server-broadcast data type:', data.type, 'userId:', data.userId);
            
            // Forward as collaboration message
            if (data && data.type) {
              this.messageHandlers.forEach(handler => handler({
                type: data.type,
                payload: data,
                ...data
              }));
            }
          } catch (error) {
            console.error('Failed to process server-broadcast:', error, payload);
          }
        });
        
        // Catch all other events for debugging
        this.socket.onAny((eventName, ...args) => {
          if (!['init-room', 'new-user', 'room-user-change', 'client-broadcast', 'first-in-room', 'server-broadcast'].includes(eventName)) {
            console.log('Socket.IO unknown event:', eventName, args);
          }
        });

      } catch (error) {
        console.error('Failed to create Socket.IO connection:', error);
        resolve(false);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  send(message: CollaborationMessage): void {
    if (this.socket?.connected) {
      console.log('Socket.IO sending message:', message.type, message);
      
      // Send the message using excalidraw-room compatible events
      if (message.type === 'join-room') {
        // Store room ID for later use - check both message.roomId and payload.roomId
        this.currentRoomId = message.roomId || message.payload?.roomId || null;
        console.log('Joining room:', this.currentRoomId, 'user:', message.userName || message.payload?.userName);
        
        // Emit init-room event to join the excalidraw-room
        if (this.currentRoomId) {
          this.socket.emit('init-room', this.currentRoomId);
          console.log('Emitted init-room for:', this.currentRoomId);
        } else {
          console.error('No room ID provided for join-room');
        }
      } else if (message.type === 'leave-room') {
        this.currentRoomId = null;
        // For leaving, we can disconnect
        this.socket.disconnect();
      } else {
        // For sync and cursor messages, use server-broadcast event (excalidraw-room format)
        // Ensure we have a room ID - use the stored one if message doesn't have it
        const roomId = message.roomId || this.currentRoomId;
        
        if (!roomId) {
          console.warn('No room ID available for server-broadcast, message:', message);
          return;
        }
        
        // Send the message payload as JSON string for excalidraw-room compatibility
        const payload = JSON.stringify(message);
        console.log('Emitting server-broadcast to room:', roomId, 'payload preview:', payload.substring(0, 200) + '...');
        this.socket.emit('server-broadcast', roomId, payload);
      }
    } else {
      console.warn('Socket.IO is not connected');
    }
  }

  onMessage(handler: (data: CollaborationMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  offMessage(handler: (data: CollaborationMessage) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  get isConnected(): boolean {
    return this.socket?.connected === true;
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