import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../../../src/hooks/useSocket';
import { socketService } from '../../../src/services/socket';

// SocketServiceのモック
vi.mock('../../../src/services/socket');

describe('useSocket', () => {
  const mockSocketService = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(socketService).connect = mockSocketService.connect;
    vi.mocked(socketService).disconnect = mockSocketService.disconnect;
    vi.mocked(socketService).isConnected = mockSocketService.isConnected;
    vi.mocked(socketService).emit = mockSocketService.emit;
    vi.mocked(socketService).on = mockSocketService.on;
    vi.mocked(socketService).off = mockSocketService.off;
    vi.mocked(socketService).joinRoom = mockSocketService.joinRoom;
    vi.mocked(socketService).leaveRoom = mockSocketService.leaveRoom;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should connect automatically by default', () => {
    renderHook(() => useSocket());
    
    expect(mockSocketService.connect).toHaveBeenCalledWith(
      'http://localhost:3002'
    );
  });

  it('should not connect automatically when autoConnect is false', () => {
    renderHook(() => useSocket({ autoConnect: false }));
    
    expect(mockSocketService.connect).not.toHaveBeenCalled();
  });

  it('should use custom URL when provided', () => {
    const customUrl = 'http://custom-server:3000';
    renderHook(() => useSocket({ url: customUrl }));
    
    expect(mockSocketService.connect).toHaveBeenCalledWith(customUrl);
  });

  it('should provide socket methods', () => {
    const { result } = renderHook(() => useSocket());
    
    expect(result.current).toHaveProperty('emit');
    expect(result.current).toHaveProperty('on');
    expect(result.current).toHaveProperty('off');
    expect(result.current).toHaveProperty('connect');
    expect(result.current).toHaveProperty('disconnect');
    expect(result.current).toHaveProperty('joinRoom');
    expect(result.current).toHaveProperty('leaveRoom');
    expect(result.current).toHaveProperty('isConnected');
  });

  it('should emit events through socketService', () => {
    const { result } = renderHook(() => useSocket());
    
    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });
    
    expect(mockSocketService.emit).toHaveBeenCalledWith('test-event', {
      data: 'test',
    });
  });

  it('should register event listeners', () => {
    const { result } = renderHook(() => useSocket());
    const callback = vi.fn();
    
    act(() => {
      result.current.on('test-event', callback);
    });
    
    expect(mockSocketService.on).toHaveBeenCalledWith('test-event', callback);
  });

  it('should cleanup listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useSocket());
    const callback = vi.fn();
    
    act(() => {
      result.current.on('test-event', callback);
    });
    
    unmount();
    
    expect(mockSocketService.off).toHaveBeenCalledWith('test-event', callback);
  });
});