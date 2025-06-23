import { useDevice } from '@excalidraw/excalidraw';
import { CollabStatusIndicator } from './CollabStatusIndicator';
import { CollaboratorsList } from './CollaboratorsList';

interface CollabMobileMenuProps {
  isConnected: boolean;
  isInRoom: boolean;
  roomId: string | null;
  collaborators: any[];
  currentUserId: string;
}

export function CollabMobileMenu({
  isConnected,
  isInRoom,
  roomId,
  collaborators,
  currentUserId,
}: CollabMobileMenuProps) {
  const device = useDevice();

  // Only render for mobile devices
  if (!device.editor.isMobile) {
    return null;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0.5rem', 
      padding: '0.5rem',
      width: '100%'
    }}>
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
  );
}