import './CollabToolbar.css';

interface CollabStatusIndicatorProps {
  isConnected: boolean;
  isInRoom: boolean;
  roomId: string | null;
  currentUsername?: string | null;
}

export function CollabStatusIndicator({
  isConnected,
  isInRoom,
  roomId,
  currentUsername,
}: CollabStatusIndicatorProps) {
  
  const generateShareUrl = () => {
    if (!roomId || !currentUsername) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('username', `Guest-${Date.now()}`);
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
    <div className="collab-status-indicator">
      <div className="connection-status">
        <div className={`status-indicator ${isInRoom ? 'collaborating' : isConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {isInRoom ? 'Collaborating' : isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {!isConnected && (
          <span className="status-warning" title="Connection lost. Attempting to reconnect...">
            ⚠️
          </span>
        )}
      </div>
      
      {isInRoom && roomId && (
        <div className="room-info-status">
          <span className="room-label">Room:</span>
          <span className="room-id">{roomId}</span>
          <button 
            className="room-copy-button"
            onClick={copyShareUrl}
            title="Copy share URL to clipboard"
          >
            📋
          </button>
        </div>
      )}
    </div>
  );
}