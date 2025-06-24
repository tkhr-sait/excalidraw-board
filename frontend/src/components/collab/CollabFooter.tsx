import { Footer, useDevice } from '@excalidraw/excalidraw';
import { EditableUsername } from './EditableUsername';
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

  const generateShareUrl = () => {
    if (!roomId) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    return url.toString();
  };

  const copyShareUrl = async () => {
    const shareUrl = generateShareUrl();
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Simple feedback - could be enhanced with toast notification
      const button = document.querySelector('.room-copy-button') as HTMLElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <Footer>
      <div className="collab-footer-container">
        {roomId && (
          <div className="room-info">
            <span>Room: {roomId}</span>
            <button 
              className="room-copy-button"
              onClick={copyShareUrl}
              title="Copy share URL to clipboard"
            >
              📋
            </button>
          </div>
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