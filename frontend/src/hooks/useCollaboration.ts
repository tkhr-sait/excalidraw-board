import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  type ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw';

// Type definitions to avoid import issues
type ExcalidrawElement = any;
type AppState = any;
import { useWebSocket } from './useWebSocket';
import { CollaborationService } from '../services/collaboration';
import { config } from '../config/environment';
import { generateRandomRoomName, generateRandomUserName } from '../utils/randomNames';

// Define types locally to avoid import issues
interface SyncData {
  type: 'sync' | 'cursor' | 'user-update';
  elements?: readonly any[];
  appState?: Partial<any>;
  collaborators?: Map<string, any>;
  cursor?: { x: number; y: number };
  userId: string;
  timestamp: number;
}

export const useCollaboration = (excalidrawAPI: ExcalidrawImperativeAPI | null) => {
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [roomId, setRoomId] = useState(() => generateRandomRoomName());
  const [userName, setUserName] = useState(() => generateRandomUserName());
  const [connectionCount, setConnectionCount] = useState(1);
  const collaborationService = useRef(new CollaborationService());
  const { isConnected, sendMessage, lastMessage, service } = useWebSocket(
    isCollaborating ? config.websocketUrl : null
  );

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage || !excalidrawAPI) return;

    const data = lastMessage as SyncData;

    if (data.userId === collaborationService.current.getUserId()) {
      return; // Ignore own messages
    }

    switch (data.type) {
      case 'sync':
        if (data.elements) {
          const currentElements = excalidrawAPI.getSceneElements();
          const merged = collaborationService.current.mergeElements(
            currentElements,
            data.elements
          );
          excalidrawAPI.updateScene({
            elements: merged,
            appState: data.appState
          });
        }
        break;

      case 'cursor':
        if (data.cursor) {
          collaborationService.current.updateCollaborator(data.userId, {
            pointer: data.cursor
          });
          excalidrawAPI.updateScene({
            collaborators: collaborationService.current.getCollaborators()
          });
        }
        break;

      case 'user-update':
        collaborationService.current.updateCollaborator(data.userId, data.appState);
        excalidrawAPI.updateScene({
          collaborators: collaborationService.current.getCollaborators()
        });
        break;

      case 'user-joined':
      case 'user-left':
      case 'room-users':
        // Update connection count based on room users
        if (data.payload && data.payload.userCount) {
          setConnectionCount(data.payload.userCount);
        }
        break;
    }
  }, [lastMessage, excalidrawAPI]);

  // Send local changes
  const syncElements = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: AppState
  ) => {
    if (!isCollaborating || !isConnected) return;

    const syncData = collaborationService.current.prepareSyncData(elements, appState);
    sendMessage({
      ...syncData,
      roomId,
      userName,
    });
  }, [isCollaborating, isConnected, sendMessage, roomId, userName]);

  // Send cursor position
  const syncCursor = useCallback((x: number, y: number) => {
    if (!isCollaborating || !isConnected) return;

    const cursorData = collaborationService.current.prepareCursorData(x, y);
    sendMessage({
      ...cursorData,
      roomId,
      userName,
    });
  }, [isCollaborating, isConnected, sendMessage, roomId, userName]);

  // Join/leave room when collaboration state changes
  useEffect(() => {
    if (isCollaborating && isConnected && service) {
      const userId = collaborationService.current.getUserId();
      service.joinRoom(roomId, userName, userId);
    } else if (!isCollaborating && service) {
      const userId = collaborationService.current.getUserId();
      service.leaveRoom(roomId, userId);
    }
  }, [isCollaborating, isConnected, roomId, userName, service]);

  // Start collaboration
  const startCollaboration = useCallback(() => {
    setIsCollaborating(true);
  }, []);

  // Stop collaboration
  const stopCollaboration = useCallback(() => {
    setIsCollaborating(false);
  }, []);

  // Toggle collaboration
  const toggleCollaboration = useCallback(() => {
    setIsCollaborating(prev => !prev);
  }, []);

  // Update room and user settings
  const updateRoomId = useCallback((newRoomId: string) => {
    setRoomId(newRoomId);
  }, []);

  const updateUserName = useCallback((newUserName: string) => {
    setUserName(newUserName);
  }, []);

  // Generate a new random username
  const generateNewUserName = useCallback(() => {
    const newUserName = generateRandomUserName();
    setUserName(newUserName);
    return newUserName;
  }, []);

  // Generate a new random room name
  const generateNewRoomName = useCallback(() => {
    const newRoomName = generateRandomRoomName();
    setRoomId(newRoomName);
    return newRoomName;
  }, []);

  return {
    isCollaborating,
    isConnected,
    roomId,
    userName,
    connectionCount,
    toggleCollaboration,
    startCollaboration,
    stopCollaboration,
    updateRoomId,
    updateUserName,
    generateNewUserName,
    generateNewRoomName,
    syncElements,
    syncCursor,
    collaborators: collaborationService.current.getCollaborators()
  };
};