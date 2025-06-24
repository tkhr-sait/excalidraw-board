import { useEffect, useRef, useCallback, useState } from 'react';
import { socketService } from '../services/socket';
import type { SocketEventName, SocketEvents } from '../types/socket';

export interface UseSocketOptions {
  autoConnect?: boolean;
  url?: string;
}

export function useSocket(options: UseSocketOptions = {}) {
  const {
    autoConnect = true,
    url = import.meta.env.VITE_WEBSOCKET_SERVER_URL || 'http://localhost:3002',
  } = options;

  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());
  const [isConnected, setIsConnected] = useState(socketService.isConnected());

  useEffect(() => {
    if (autoConnect && !socketService.isConnected()) {
      socketService.connect(url);
    }

    // Listen for connection state changes
    const handleConnect = () => {
      console.log('useSocket: Socket connected, updating state');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('useSocket: Socket disconnected, updating state');
      setIsConnected(false);
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);

    return () => {
      // コンポーネントがアンマウントされるときにリスナーをクリア
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      
      listenersRef.current.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          socketService.off(event as SocketEventName, callback as any);
        });
      });
      listenersRef.current.clear();
    };
  }, [autoConnect, url]);

  const emit = useCallback(
    <K extends SocketEventName>(
      event: K,
      data: Parameters<SocketEvents[K]>[0]
    ) => {
      socketService.emit(event, data);
    },
    []
  );

  const on = useCallback(
    <K extends SocketEventName>(
      event: K,
      callback: SocketEvents[K]
    ) => {
      socketService.on(event, callback);

      // リスナーを追跡
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(callback as Function);
    },
    []
  );

  const off = useCallback(
    <K extends SocketEventName>(
      event: K,
      callback?: SocketEvents[K]
    ) => {
      socketService.off(event, callback);

      // リスナーの追跡を削除
      if (callback && listenersRef.current.has(event)) {
        listenersRef.current.get(event)!.delete(callback as Function);
      }
    },
    []
  );

  const connect = useCallback(() => {
    if (!socketService.isConnected()) {
      socketService.connect(url);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  const joinRoom = useCallback(
    (roomId: string, username: string) => {
      socketService.joinRoom(roomId, username);
    },
    []
  );

  const leaveRoom = useCallback((roomId: string) => {
    socketService.leaveRoom(roomId);
  }, []);

  return {
    emit,
    on,
    off,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    isConnected,
  };
}