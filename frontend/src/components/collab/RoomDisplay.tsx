import './RoomDisplay.css';

interface RoomDisplayProps {
  roomId: string;
  onCopy?: () => void;
}

export function RoomDisplay({ roomId, onCopy }: RoomDisplayProps) {
  const handleCopy = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    const shareUrl = url.toString();
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      onCopy?.();
      
      // Visual feedback
      const button = document.querySelector('.room-display-copy') as HTMLElement;
      if (button) {
        button.classList.add('copied');
        setTimeout(() => {
          button.classList.remove('copied');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="room-display">
      <span className="room-display-icon">🚪</span>
      <span className="room-display-id">{roomId}</span>
      <button 
        className="room-display-copy"
        onClick={handleCopy}
        title="Copy share URL to clipboard"
        aria-label="Copy room link"
      >
        <span className="copy-icon">📋</span>
        <span className="copy-text">Copied!</span>
      </button>
    </div>
  );
}