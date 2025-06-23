import React, { useState, useCallback } from 'react';
import { 
  Excalidraw, 
  MainMenu,
  Footer,
  LiveCollaborationTrigger,
  type ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw';
import { useCollaboration } from '../hooks/useCollaboration';
// Note: CollaborationTopRightUI and CollaborationMainMenu imports removed as they're not currently used
// import { CollaborationTopRightUI } from './CollaborationTopRightUI';
// import { CollaborationMainMenu } from './CollaborationMainMenu';
import { CollaborationFooter } from './CollaborationFooter';
import '@excalidraw/excalidraw/index.css';

export const CollaborativeExcalidrawBoard: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

  // Expose API to window for testing purposes
  React.useEffect(() => {
    if (excalidrawAPI) {
      (window as any).excalidrawAPI = excalidrawAPI;
    }
  }, [excalidrawAPI]);
  const {
    isCollaborating,
    isConnected,
    roomId,
    userName,
    connectionCount,
    // toggleCollaboration, // Not used in current implementation
    startCollaboration,
    stopCollaboration,
    updateRoomId,
    updateUserName,
    generateNewUserName,
    generateNewRoomName,
    syncElements,
    syncCursor,
    // collaborators // Available but not directly used in this component
  } = useCollaboration(excalidrawAPI);

  const handleChange = useCallback((elements: any, appState: any, files: any) => {
    console.log('handleChange called with elements:', elements?.length || 0);
    // Only sync if we have valid elements and we're actively collaborating
    if (isCollaborating && elements) {
      syncElements(elements, appState, files);
    }
  }, [syncElements, isCollaborating]);

  const handlePointerUpdate = useCallback((payload: any) => {
    if (payload.pointer) {
      syncCursor(payload.pointer.x, payload.pointer.y);
    }
  }, [syncCursor]);

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }} data-testid="excalidraw-board">      
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        isCollaborating={isCollaborating}
        renderTopRightUI={() => (
          <div data-testid="live-collaboration-trigger">
            <LiveCollaborationTrigger
              isCollaborating={isCollaborating}
              onSelect={() => {
                if (!isCollaborating) {
                  startCollaboration();
                } else {
                  stopCollaboration();
                }
              }}
            />
          </div>
        )}
      >
        {/* Default Main Menu */}
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
        </MainMenu>

        {/* Collaboration Status Footer */}
        <Footer>
          <CollaborationFooter
            isCollaborating={isCollaborating}
            isConnected={isConnected}
            roomId={roomId}
            userName={userName}
            connectionCount={connectionCount}
            onGenerateNewUserName={generateNewUserName}
            onRoomChange={updateRoomId}
            onUserNameChange={updateUserName}
            onStartCollaboration={startCollaboration}
            onStopCollaboration={stopCollaboration}
            onGenerateNewRoomName={generateNewRoomName}
          />
        </Footer>
      </Excalidraw>
    </div>
  );
};