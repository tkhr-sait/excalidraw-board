import { useParams } from 'react-router-dom';

const CollaborativeBoard: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <div className="h-[calc(100vh-73px)] bg-white">
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Collaborative Board
          </h2>
          <p className="text-gray-600 mb-4">
            Room ID: <span className="font-mono">{roomId}</span>
          </p>
          <p className="text-gray-500">
            Excalidraw component will be integrated here
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeBoard;