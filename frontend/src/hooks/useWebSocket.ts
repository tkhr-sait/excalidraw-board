import { useEffect, useRef, useState } from 'react';
import { WebSocketService } from '../services/websocket';

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
  const wsService = useRef<WebSocketService>(new WebSocketService());

  useEffect(() => {
    if (!url) return;

    const connect = async () => {
      const connected = await wsService.current.connect(url);
      setIsConnected(connected);
    };

    const messageHandler = (data: CollaborationMessage) => {
      setLastMessage(data);
    };

    wsService.current.onMessage(messageHandler);
    connect();

    return () => {
      wsService.current.offMessage(messageHandler);
      wsService.current.disconnect();
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