import { useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { 
  connectionStatusAtom, 
  roomIdAtom, 
  connectedUsersAtom,
  elementsAtom,
  appStateAtom 
} from '../stores/atoms/boardAtoms';
import { websocketService, WebSocketCallbacks } from '../services/websocket';

const WEBSOCKET_URL = 'http://localhost:3002';

export function useCollaboration(roomId: string) {
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [, setRoomId] = useAtom(roomIdAtom);
  const [connectedUsers, setConnectedUsers] = useAtom(connectedUsersAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const [appState, setAppState] = useAtom(appStateAtom);
  
  const lastUpdateRef = useRef<{ elements: any[], appState: any } | null>(null);
  const isReceivingUpdateRef = useRef(false);

  // WebSocket callbacks
  const callbacks: WebSocketCallbacks = {
    onConnect: () => {
      setConnectionStatus('connected');
      console.log('🔗 Collaboration connected');
    },
    
    onDisconnect: (reason: string) => {
      setConnectionStatus('disconnected');
      setConnectedUsers([]);
      console.log('🔌 Collaboration disconnected:', reason);
    },
    
    onConnectionError: (error: Error) => {
      setConnectionStatus('disconnected');
      console.error('🚨 Collaboration error:', error);
    },
    
    onRoomUserChange: (users: string[]) => {
      setConnectedUsers(users);
    },
    
    onNewUser: (userId: string) => {
      console.log('👋 New collaborator joined:', userId);
      // Could trigger a welcome notification
    },
    
    onUserLeft: (userId: string) => {
      console.log('👋 Collaborator left:', userId);
    },
    
    onSceneUpdate: (remoteElements: any[], remoteAppState: any) => {
      // Prevent infinite loops
      if (isReceivingUpdateRef.current) return;
      
      isReceivingUpdateRef.current = true;
      
      try {
        // Simple merge strategy: take remote updates as-is
        // In a production app, you'd want more sophisticated conflict resolution
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
    }
  };

  // Connect to room on mount
  useEffect(() => {
    if (!roomId) return;

    setRoomId(roomId);
    setConnectionStatus('connecting');
    
    websocketService.connect(WEBSOCKET_URL, roomId, callbacks);

    return () => {
      websocketService.disconnect();
      setConnectionStatus('disconnected');
      setConnectedUsers([]);
    };
  }, [roomId]);

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

    // Update local state first
    setElements(newElements);
    setAppState(newAppState);
    
    // Send to other users
    if (websocketService.isConnected()) {
      websocketService.sendSceneUpdate(newElements, newAppState);
      lastUpdateRef.current = { elements: newElements, appState: newAppState };
      console.log('📤 Scene update sent:', newElements.length, 'elements');
    }
  }, [setElements, setAppState]);

  // Send cursor position (optional feature)
  const sendCursorUpdate = useCallback((x: number, y: number) => {
    if (websocketService.isConnected()) {
      websocketService.sendCursorUpdate(x, y);
    }
  }, []);

  return {
    // Connection state
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    connectionStatus,
    
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