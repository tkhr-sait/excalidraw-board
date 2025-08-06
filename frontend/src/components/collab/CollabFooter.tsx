import { Footer, useDevice } from '@excalidraw/excalidraw';
import { EditableUsername } from './EditableUsername';
import { RoomDisplay } from './RoomDisplay';
import './CollabFooter.css';

interface CollabFooterProps {
  roomId: string | null;
  currentUserId: string;
  onUsernameChange?: (newUsername: string) => void;
  onShowHistory?: () => void;
  historyCount?: number;
}

export function CollabFooter({
  roomId,
  currentUserId,
  onUsernameChange,
  onShowHistory,
  historyCount = 0,
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
        
        {roomId && onShowHistory && (
          <button 
            className="collab-history-button"
            onClick={onShowHistory}
            title="現在のルームの変更履歴を表示"
          >
            📜 履歴 ({historyCount})
          </button>
        )}
        
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