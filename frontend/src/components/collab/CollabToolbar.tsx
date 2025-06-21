import './CollabToolbar.css';

interface CollabToolbarProps {
  isConnected: boolean;
  isInRoom: boolean;
  roomId: string | null;
  onJoinRoom: () => void;
  onLeaveRoom: () => void;
}

export function CollabToolbar({
  isConnected,
  isInRoom,
  roomId,
  onJoinRoom,
  onLeaveRoom,
}: CollabToolbarProps) {
  return (
    <div className="collab-toolbar">
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {isInRoom ? (
        <div className="room-info">
          <span className="room-label">Room:</span>
          <span className="room-id">{roomId}</span>
          <button 
            className="leave-button"
            onClick={onLeaveRoom}
            aria-label="Leave room"
          >
            Leave Room
          </button>
        </div>
      ) : (
        <button 
          className="join-button"
          onClick={onJoinRoom}
          aria-label="Join room"
          title={!isConnected ? "Socket disconnected - you can still open the join dialog" : "Join a collaboration room"}
        >
          Join Room
        </button>
      )}
    </div>
  );
}