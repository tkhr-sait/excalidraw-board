import { useDevice } from '@excalidraw/excalidraw';
import { CollabStatusIndicator } from './CollabStatusIndicator';
import { EditableUsername } from './EditableUsername';

interface CollabMobileMenuProps {
  isConnected: boolean;
  isInRoom: boolean;
  roomId: string | null;
  collaborators: any[];
  currentUserId: string;
  onUsernameChange?: (newUsername: string) => void;
}

export function CollabMobileMenu({
  isConnected,
  isInRoom,
  roomId,
  collaborators: _collaborators,
  currentUserId,
  onUsernameChange,
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
        currentUsername={currentUserId}
      />
      
      {isInRoom && currentUserId && (
        <EditableUsername 
          username={currentUserId}
          onUsernameChange={onUsernameChange}
        />
      )}
    </div>
  );
}