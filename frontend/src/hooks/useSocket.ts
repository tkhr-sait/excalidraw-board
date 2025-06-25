import { useEffect, useRef, useCallback, useState } from 'react';
import { socketService } from '../services/socket';
import type { SocketEventName, SocketEvents } from '../types/socket';

export interface UseSocketOptions {
  autoConnect?: boolean;
  url?: string;
  fallbackUrls?: string[];
}

// Helper function to get WebSocket URL with fallback logic
function getWebSocketUrl(customUrl?: string, _fallbackUrls?: string[]): string {
  // First priority: Custom URL provided
  if (customUrl) {
    return customUrl;
  }

  // Second priority: Runtime environment variable from window.ENV
  if (typeof window !== 'undefined' && (window as any).ENV?.VITE_WEBSOCKET_SERVER_URL) {
    const runtimeUrl = (window as any).ENV.VITE_WEBSOCKET_SERVER_URL;
    if (runtimeUrl) {
      return runtimeUrl;
    }
  }

  // Third priority: Build-time environment variable
  const envUrl = import.meta.env.VITE_WEBSOCKET_SERVER_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fourth priority: Auto-detect based on current location
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isSecure = protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';

    // Try to use the same host as the frontend
    const detectedUrl = `${wsProtocol}//${hostname}:3002`;

    // Debug logging
    const debugEnabled = (window as any).ENV?.VITE_DEBUG_WEBSOCKET === 'true' || 
                        import.meta.env.VITE_DEBUG_WEBSOCKET === 'true';
    if (debugEnabled) {
      console.log('WebSocket URL auto-detection:', {
        protocol,
        hostname,
        port,
        detectedUrl,
        runtimeEnv: (window as any).ENV,
        buildEnv: import.meta.env.VITE_WEBSOCKET_SERVER_URL
      });
    }

    return detectedUrl;
  }

  // Final fallback: localhost
  return 'http://localhost:3002';
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, url, fallbackUrls = [] } = options;

  const primaryUrl = getWebSocketUrl(url, fallbackUrls);

  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());
  const [isConnected, setIsConnected] = useState(socketService.isConnected());

  useEffect(() => {
    if (autoConnect && !socketService.isConnected()) {
      // Try to connect with primary URL and fallback URLs
      console.log('Attempting WebSocket connection to:', primaryUrl);
      socketService.connect(primaryUrl, fallbackUrls);
    }

    // Listen for connection state changes
    const handleConnect = () => {
      console.log('useSocket: Socket connected, updating state');
      setIsConnected(true);
      // Update global debug info when socket connects
      if (typeof window !== 'undefined') {
        (window as any).socketId = socketService.getSocketId();
      }
    };

    const handleDisconnect = () => {
      console.log('useSocket: Socket disconnected, updating state');
      setIsConnected(false);
      // Clear debug info when socket disconnects
      if (typeof window !== 'undefined') {
        (window as any).socketId = null;
      }
    };

    socketService.on('connect' as any, handleConnect);
    socketService.on('disconnect' as any, handleDisconnect);

    return () => {
      // コンポーネントがアンマウントされるときにリスナーをクリア
      socketService.off('connect' as any, handleConnect);
      socketService.off('disconnect' as any, handleDisconnect);

      listenersRef.current.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          socketService.off(event as SocketEventName, callback as any);
        });
      });
      listenersRef.current.clear();
    };
  }, [autoConnect, primaryUrl]);

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
    <K extends SocketEventName>(event: K, callback: SocketEvents[K]) => {
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
    <K extends SocketEventName>(event: K, callback?: SocketEvents[K]) => {
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
      console.log('Manual WebSocket connection to:', primaryUrl);
      socketService.connect(primaryUrl, fallbackUrls);
    }
  }, [primaryUrl, fallbackUrls]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  const joinRoom = useCallback((roomId: string, username: string) => {
    socketService.joinRoom(roomId, username);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketService.leaveRoom(roomId);
  }, []);

  const updateUsername = useCallback((roomId: string, username: string) => {
    socketService.updateUsername(roomId, username);
  }, []);

  const getSocketId = useCallback(() => {
    return socketService.getSocketId();
  }, []);

  return {
    emit,
    on,
    off,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    updateUsername,
    isConnected,
    getSocketId,
  };
}
