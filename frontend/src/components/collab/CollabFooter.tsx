import { Footer, useDevice } from '@excalidraw/excalidraw';
import { CollabStatusIndicator } from './CollabStatusIndicator';
import { CollaboratorsList } from './CollaboratorsList';
import './CollabFooter.css';

interface CollabFooterProps {
  isConnected: boolean;
  isInRoom: boolean;
  roomId: string | null;
  collaborators: any[];
  currentUserId: string;
}

export function CollabFooter({
  isConnected,
  isInRoom,
  roomId,
  collaborators,
  currentUserId,
}: CollabFooterProps) {
  const device = useDevice();

  // For mobile devices, render in MainMenu instead of Footer
  if (device.editor.isMobile) {
    return null; // Mobile will be handled separately in MainMenu
  }

  return (
    <Footer>
      <div className="collab-footer-container">
        <CollabStatusIndicator
          isConnected={isConnected}
          isInRoom={isInRoom}
          roomId={roomId}
        />
        
        {isInRoom && collaborators.length > 0 && (
          <CollaboratorsList 
            collaborators={collaborators}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </Footer>
  );
}