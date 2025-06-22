import { useParams } from 'react-router-dom';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useCollaboration } from '../../hooks/useCollaboration';

const CollaborativeBoard: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  
  if (!roomId) {
    return (
      <div className="h-[calc(100vh-73px)] bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Room</h2>
          <p className="text-gray-600">Room ID is required to access the board.</p>
        </div>
      </div>
    );
  }

  const {
    isConnected,
    isConnecting,
    collaboratorCount,
    sendSceneUpdate,
    elements,
    appState
  } = useCollaboration(roomId);

  const handleChange = (newElements: readonly any[], newAppState: any) => {
    // Send updates to other collaborators
    sendSceneUpdate([...newElements], newAppState);
  };

  return (
    <div className="h-[calc(100vh-73px)] bg-white relative">
      {/* Connection status indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500' : 
          isConnecting ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <span className="text-sm text-gray-600">
          {isConnected ? `Connected (${collaboratorCount} user${collaboratorCount !== 1 ? 's' : ''})` :
           isConnecting ? 'Connecting...' :
           'Disconnected'}
        </span>
      </div>

      {/* Excalidraw canvas */}
      <div className="h-full w-full">
        <Excalidraw
          onChange={handleChange}
          initialData={{
            elements: elements,
            appState: {
              viewBackgroundColor: "#ffffff",
              ...appState,
            },
          }}
          // Controlled by collaboration state
          key={`${roomId}-${isConnected}`}
        />
      </div>

      {/* Disconnected overlay */}
      {!isConnected && !isConnecting && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Lost</h3>
            <p className="text-gray-600 mb-4">
              You've been disconnected from the collaboration session. 
              Your changes are saved locally.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeBoard;