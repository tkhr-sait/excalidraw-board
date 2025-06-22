import { Link, useParams } from 'react-router-dom';
import { useAtom } from 'jotai';
import { connectionStatusAtom, connectedUsersAtom } from '../../stores/atoms/boardAtoms';

const Header: React.FC = () => {
  const { roomId } = useParams();
  const [connectionStatus] = useAtom(connectionStatusAtom);
  const [connectedUsers] = useAtom(connectedUsersAtom);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return `Connected (${connectedUsers.length} user${connectedUsers.length !== 1 ? 's' : ''})`;
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold text-gray-900">
            Excalidraw Board
          </Link>
          {roomId && (
            <div className="text-sm text-gray-500">
              Room: <span className="font-mono">{roomId}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {roomId && (
            <button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                // Simple feedback
                const button = event?.target as HTMLButtonElement;
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 1000);
              }}
              className="btn-secondary text-sm"
            >
              Share Room
            </button>
          )}
          
          <div className="text-sm text-gray-500">
            Status: <span className={getStatusColor()}>{getStatusText()}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;