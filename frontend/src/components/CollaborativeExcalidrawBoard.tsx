import React, { useState, useCallback } from 'react';
import { 
  Excalidraw, 
  LiveCollaborationTrigger 
} from '@excalidraw/excalidraw';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useCollaboration } from '../hooks/useCollaboration';
import { ConnectionStatus } from './ConnectionStatus';
import '@excalidraw/excalidraw/index.css';

export const CollaborativeExcalidrawBoard: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const {
    isCollaborating,
    isConnected,
    toggleCollaboration,
    syncElements,
    syncCursor,
    collaborators
  } = useCollaboration(excalidrawAPI);

  const handleChange = useCallback((elements: any, appState: any) => {
    syncElements(elements, appState);
  }, [syncElements]);

  const handlePointerUpdate = useCallback((payload: any) => {
    if (payload.pointer) {
      syncCursor(payload.pointer.x, payload.pointer.y);
    }
  }, [syncCursor]);

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <ConnectionStatus isConnected={isConnected && isCollaborating} />
      
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        isCollaborating={isCollaborating}
        renderTopRightUI={() => (
          <LiveCollaborationTrigger
            isCollaborating={isCollaborating}
            onSelect={toggleCollaboration}
          />
        )}
      />
    </div>
  );
};