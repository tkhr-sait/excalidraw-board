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
      
      {isInRoom ? (
        <div className="room-info">
          <span className="room-label">Room:</span>
          <span className="room-id">{roomId}</span>
          <button 
            className="leave-button"
            onClick={onLeaveRoom}
            aria-label="Leave room"
            data-testid="collab-leave-room-button"
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
          data-testid="collab-join-room-button"
        >
          Join Room
        </button>
      )}
    </div>
  );
}