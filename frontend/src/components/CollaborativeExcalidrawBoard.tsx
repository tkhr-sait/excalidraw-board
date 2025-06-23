import React, { useState, useCallback } from 'react';
import { 
  Excalidraw, 
  MainMenu,
  Footer,
  type ExcalidrawImperativeAPI
} from '@excalidraw/excalidraw';
import { useCollaboration } from '../hooks/useCollaboration';
import { CollaborationTopRightUI } from './CollaborationTopRightUI';
import { CollaborationMainMenu } from './CollaborationMainMenu';
import { CollaborationFooter } from './CollaborationFooter';
import '@excalidraw/excalidraw/index.css';

export const CollaborativeExcalidrawBoard: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const {
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
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }} data-testid="excalidraw-board">      
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        isCollaborating={isCollaborating}
        renderTopRightUI={() => (
          <CollaborationTopRightUI
            isCollaborating={isCollaborating}
            isConnected={isConnected}
            userName={userName}
            connectionCount={connectionCount}
          />
        )}
      >
        {/* Custom Main Menu with Collaboration Items */}
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.Separator />
          <MainMenu.ItemCustom>
            <CollaborationMainMenu
              isCollaborating={isCollaborating}
              roomId={roomId}
              userName={userName}
              onRoomChange={updateRoomId}
              onUserNameChange={updateUserName}
              onStartCollaboration={startCollaboration}
              onStopCollaboration={stopCollaboration}
              onGenerateNewUserName={generateNewUserName}
              onGenerateNewRoomName={generateNewRoomName}
            />
          </MainMenu.ItemCustom>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
        </MainMenu>

        {/* Custom Footer with Collaboration Status */}
        <Footer>
          <CollaborationFooter
            isCollaborating={isCollaborating}
            isConnected={isConnected}
            roomId={roomId}
            userName={userName}
            connectionCount={connectionCount}
            onGenerateNewUserName={generateNewUserName}
          />
        </Footer>
      </Excalidraw>
    </div>
  );
};