import { useEffect, useRef, useState } from 'react';
import { SocketIOWebSocketService } from '../services/socketio-websocket';

// Define type locally to avoid import issues
interface CollaborationMessage {
  type: string;
  payload: any;
  userId?: string;
  timestamp?: number;
}

export const useWebSocket = (url: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<CollaborationMessage | null>(null);
  const wsService = useRef<SocketIOWebSocketService>(new SocketIOWebSocketService());

  useEffect(() => {
    if (!url) {
      setIsConnected(false);
      return;
    }

    const connect = async () => {
      const connected = await wsService.current.connect(url);
      setIsConnected(connected);
    };

    const messageHandler = (data: CollaborationMessage) => {
      setLastMessage(data);
    };

    const connectionStateHandler = (connected: boolean) => {
      setIsConnected(connected);
    };

    wsService.current.onMessage(messageHandler);
    wsService.current.onConnectionStateChange(connectionStateHandler);
    connect();

    return () => {
      wsService.current.offMessage(messageHandler);
      wsService.current.offConnectionStateChange(connectionStateHandler);
      wsService.current.disconnect();
      setIsConnected(false);
    };
  }, [url]);

  const sendMessage = (message: CollaborationMessage) => {
    wsService.current.send(message);
  };

  return {
    isConnected,
    sendMessage,
    lastMessage,
    service: wsService.current
  };
};