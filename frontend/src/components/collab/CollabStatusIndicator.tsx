import './CollabToolbar.css';

interface CollabStatusIndicatorProps {
  isConnected: boolean;
  isInRoom: boolean;
  roomId: string | null;
}

export function CollabStatusIndicator({
  isConnected,
  isInRoom,
  roomId,
}: CollabStatusIndicatorProps) {
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
        </div>
      )}
    </div>
  );
}