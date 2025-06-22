import { useEffect, useCallback, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { 
  connectionStatusAtom, 
  roomIdAtom, 
  connectedUsersAtom,
  elementsAtom,
  appStateAtom 
} from '../stores/atoms/boardAtoms';
import { websocketService, WebSocketCallbacks } from '../services/websocket';

const WEBSOCKET_URL = window.location.origin; // Use same origin as frontend

export function useCollaboration(roomId: string) {
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [, setRoomId] = useAtom(roomIdAtom);
  const [connectedUsers, setConnectedUsers] = useAtom(connectedUsersAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const [appState, setAppState] = useAtom(appStateAtom);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const lastUpdateRef = useRef<{ elements: any[], appState: any } | null>(null);
  const isReceivingUpdateRef = useRef(false);

  // WebSocket callbacks (memoized to prevent infinite loops)
  const onConnect = useCallback(() => {
    setConnectionStatus('connected');
    console.log('🔗 Collaboration connected');
  }, [setConnectionStatus]);
  
  const onDisconnect = useCallback((reason: string) => {
    setConnectionStatus('disconnected');
    setConnectedUsers([]);
    console.log('🔌 Collaboration disconnected:', reason);
  }, [setConnectionStatus, setConnectedUsers]);
  
  const onConnectionError = useCallback((error: Error) => {
    setConnectionStatus('disconnected');
    console.error('🚨 Collaboration error:', error);
  }, [setConnectionStatus]);
  
  const onRoomUserChange = useCallback((users: string[]) => {
    setConnectedUsers(users);
  }, [setConnectedUsers]);
  
  const onNewUser = useCallback((userId: string) => {
    console.log('👋 New collaborator joined:', userId);
  }, []);
  
  const onUserLeft = useCallback((userId: string) => {
    console.log('👋 Collaborator left:', userId);
  }, []);
  
  const onSceneUpdate = useCallback((remoteElements: any[], remoteAppState: any) => {
    // Prevent infinite loops
    if (isReceivingUpdateRef.current) return;
    
    isReceivingUpdateRef.current = true;
    
    try {
      // Simple merge strategy: take remote updates as-is
      setElements(remoteElements);
      setAppState((prev: any) => ({
        ...prev,
        ...remoteAppState,
        // Preserve local-only state
        cursorButton: prev.cursorButton,
        draggingElement: prev.draggingElement,
      }));
      
      lastUpdateRef.current = { elements: remoteElements, appState: remoteAppState };
      
      console.log('📥 Scene updated from remote:', remoteElements.length, 'elements');
    } finally {
      // Allow sending updates again after a brief delay
      setTimeout(() => {
        isReceivingUpdateRef.current = false;
      }, 100);
    }
  }, [setElements, setAppState]);

  // Handle online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Network online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
      console.log('🌐 Network offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setConnectionStatus]);

  // Connect to room on mount
  useEffect(() => {
    if (!roomId || roomId.trim() === '') return;

    const callbacks: WebSocketCallbacks = {
      onConnect,
      onDisconnect,
      onConnectionError,
      onRoomUserChange,
      onNewUser,
      onUserLeft,
      onSceneUpdate,
    };

    setRoomId(roomId);
    setConnectionStatus('connecting');
    
    websocketService.connect(WEBSOCKET_URL, roomId, callbacks);

    return () => {
      websocketService.disconnect();
      setConnectionStatus('disconnected');
      setConnectedUsers([]);
    };
  }, [roomId]); // Only depend on roomId to prevent infinite loops

  // Send scene updates to other users
  const sendSceneUpdate = useCallback((newElements: any[], newAppState: any) => {
    // Prevent sending updates while receiving them
    if (isReceivingUpdateRef.current) return;
    
    // Check if this is actually a change
    const lastUpdate = lastUpdateRef.current;
    if (lastUpdate) {
      const elementsChanged = JSON.stringify(lastUpdate.elements) !== JSON.stringify(newElements);
      const appStateChanged = JSON.stringify(lastUpdate.appState) !== JSON.stringify(newAppState);
      
      if (!elementsChanged && !appStateChanged) {
        return; // No actual change
      }
    }

    // Send to other users
    if (websocketService.isConnected()) {
      websocketService.sendSceneUpdate(newElements, newAppState);
      lastUpdateRef.current = { elements: newElements, appState: newAppState };
    }
  }, []); // Remove setElements and setAppState dependencies to prevent loops

  // Send cursor position (optional feature)
  const sendCursorUpdate = useCallback((x: number, y: number) => {
    if (websocketService.isConnected()) {
      websocketService.sendCursorUpdate(x, y);
    }
  }, []);

  return {
    // Connection state
    isConnected: connectionStatus === 'connected' && isOnline,
    isConnecting: connectionStatus === 'connecting',
    connectionStatus: isOnline ? connectionStatus : 'disconnected',
    
    // Collaboration state
    connectedUsers,
    collaboratorCount: connectedUsers.length,
    
    // Actions
    sendSceneUpdate,
    sendCursorUpdate,
    
    // Current state (for Excalidraw)
    elements,
    appState
  };
}