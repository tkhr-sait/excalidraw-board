import { Link } from 'react-router-dom';

const WelcomeScreen: React.FC = () => {
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100">
      <div className="max-w-2xl mx-auto text-center px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Welcome to Excalidraw Board
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Create and collaborate on drawings in real-time with your team.
        </p>
        
        <div className="space-y-4">
          <Link
            to={`/room/${generateRoomId()}`}
            className="inline-block btn-primary text-lg px-8 py-3"
          >
            Create New Board
          </Link>
          
          <div className="text-gray-500">
            or
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <input
              type="text"
              placeholder="Enter room ID"
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const roomId = (e.target as HTMLInputElement).value.trim();
                  if (roomId) {
                    window.location.href = `/room/${roomId}`;
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="Enter room ID"]') as HTMLInputElement;
                const roomId = input.value.trim();
                if (roomId) {
                  window.location.href = `/room/${roomId}`;
                }
              }}
              className="btn-secondary"
            >
              Join Room
            </button>
          </div>
        </div>
        
        <div className="mt-12 text-sm text-gray-500">
          <p>
            Built with Excalidraw • Open Source • Self-Hosted
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;