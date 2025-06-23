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
    }
  }, [lastMessage, excalidrawAPI]);

  // Send local changes
  const syncElements = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: AppState
  ) => {
    if (!isCollaborating || !isConnected) return;

    const syncData = collaborationService.current.prepareSyncData(elements, appState);
    sendMessage(syncData);
  }, [isCollaborating, isConnected, sendMessage]);

  // Send cursor position
  const syncCursor = useCallback((x: number, y: number) => {
    if (!isCollaborating || !isConnected) return;

    const cursorData = collaborationService.current.prepareCursorData(x, y);
    sendMessage(cursorData);
  }, [isCollaborating, isConnected, sendMessage]);

  // Toggle collaboration
  const toggleCollaboration = useCallback(() => {
    setIsCollaborating(prev => !prev);
  }, []);

  return {
    isCollaborating,
    isConnected,
    toggleCollaboration,
    syncElements,
    syncCursor,
    collaborators: collaborationService.current.getCollaborators()
  };
};