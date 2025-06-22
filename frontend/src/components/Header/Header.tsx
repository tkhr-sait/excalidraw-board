import { Link, useParams } from 'react-router-dom';

const Header: React.FC = () => {
  const { roomId } = useParams();

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
                // TODO: Add toast notification
              }}
              className="btn-secondary text-sm"
            >
              Share Room
            </button>
          )}
          
          <div className="text-sm text-gray-500">
            Status: <span className="text-green-600">Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;