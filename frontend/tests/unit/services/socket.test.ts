import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocketService } from '../../../src/services/socket';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

describe('SocketService', () => {
  let socketService: SocketService;
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    mockSocket = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      connected: false,
    };
    
    vi.mocked(io).mockReturnValue(mockSocket as Socket);
    socketService = new SocketService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect to the server', () => {
      const url = 'http://localhost:3002';
      socketService.connect(url);
      
      expect(io).toHaveBeenCalledWith(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });
    });

    it('should disconnect from the server', () => {
      socketService.connect('http://localhost:3002');
      socketService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle connection state', () => {
      expect(socketService.isConnected()).toBe(false);
      
      socketService.connect('http://localhost:3002');
      mockSocket.connected = true;
      
      expect(socketService.isConnected()).toBe(true);
    });
  });

  describe('Room Management', () => {
    beforeEach(() => {
      socketService.connect('http://localhost:3002');
    });

    it('should join a room', () => {
      const roomId = 'test-room';
      const username = 'test-user';
      
      socketService.joinRoom(roomId, username);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('join-room', {
        roomId,
        username,
      });
    });

    it('should leave a room', () => {
      const roomId = 'test-room';
      
      socketService.leaveRoom(roomId);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-room', { roomId });
    });
  });

  describe('Event Handling', () => {
    it('should register event listeners', () => {
      socketService.connect('http://localhost:3002');
      const callback = vi.fn();
      
      socketService.on('test-event', callback);
      
      expect(mockSocket.on).toHaveBeenCalledWith('test-event', callback);
    });

    it('should remove event listeners', () => {
      socketService.connect('http://localhost:3002');
      const callback = vi.fn();
      
      socketService.off('test-event', callback);
      
      expect(mockSocket.off).toHaveBeenCalledWith('test-event', callback);
    });
  });
});