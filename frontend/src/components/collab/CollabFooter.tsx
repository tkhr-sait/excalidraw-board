import { Footer, useDevice } from '@excalidraw/excalidraw';
import { EditableUsername } from './EditableUsername';
import { RoomDisplay } from './RoomDisplay';
import './CollabFooter.css';

interface CollabFooterProps {
  roomId: string | null;
  currentUserId: string;
  onUsernameChange?: (newUsername: string) => void;
}

export function CollabFooter({
  roomId,
  currentUserId,
  onUsernameChange,
}: CollabFooterProps) {
  const device = useDevice();

  // For mobile devices, render in MainMenu instead of Footer
  if (device.editor.isMobile) {
    return null; // Mobile will be handled separately in MainMenu
  }


  return (
    <Footer>
      <div className="collab-footer-container">
        {roomId && <RoomDisplay roomId={roomId} />}
        
        {currentUserId && (
          <EditableUsername 
            username={currentUserId}
            onUsernameChange={onUsernameChange}
          />
        )}
      </div>
    </Footer>
  );
}