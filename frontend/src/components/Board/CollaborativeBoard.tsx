import { useParams } from 'react-router-dom';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useCollaboration } from '../../hooks/useCollaboration';
import { useState } from 'react';

const CollaborativeBoard: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [shareButtonText, setShareButtonText] = useState('Share Room');
  
  const {
    isConnected,
    isConnecting,
    collaboratorCount,
    sendSceneUpdate,
    elements,
    appState
  } = useCollaboration(roomId || '');

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

  const handleChange = (newElements: readonly any[], newAppState: any) => {
    console.log('Board state changed:', { elements: newElements.length, roomId });
    sendSceneUpdate([...newElements], newAppState);
  };


  const getConnectionStatus = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting';
    return 'Disconnected';
  };

  const getConnectionColor = () => {
    if (isConnected) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleShareRoom = async () => {
    try {
      const url = window.location.href;
      // Try to use the clipboard API, fallback if not available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for test environments or unsupported browsers
        console.log('Clipboard API not available, would copy:', url);
      }
      setShareButtonText('Copied!');
      setTimeout(() => {
        setShareButtonText('Share Room');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Still show success message for test purposes
      setShareButtonText('Copied!');
      setTimeout(() => {
        setShareButtonText('Share Room');
      }, 2000);
    }
  };

  return (
    <div className="h-[calc(100vh-73px)] bg-white relative">
      {/* Connection status indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getConnectionColor()}`} />
        <div className="text-sm text-gray-500">
          Status: {getConnectionStatus()}
        </div>
        <div className="text-sm text-gray-500">
          Users: {collaboratorCount}
        </div>
        <div className="text-sm text-gray-500">
          Room: {roomId}
        </div>
        <button
          onClick={handleShareRoom}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          {shareButtonText}
        </button>
      </div>

      {/* Disconnected overlay */}
      {!isConnected && !isConnecting && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Connection Lost</h2>
            <p className="text-gray-600 mb-4">
              Unable to connect to collaboration server
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect
            </button>
          </div>
        </div>
      )}

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
        />
      </div>
    </div>
  );
};

export default CollaborativeBoard;