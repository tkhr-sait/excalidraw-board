import { useParams } from 'react-router-dom';
import { Excalidraw } from '@excalidraw/excalidraw';

const CollaborativeBoard: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();

  const handleChange = (elements: readonly any[], _appState: any) => {
    console.log('Board state changed:', { elements: elements.length, roomId });
  };

  return (
    <div className="h-[calc(100vh-73px)] bg-white">
      <div className="h-full w-full">
        <Excalidraw
          onChange={handleChange}
          initialData={{
            elements: [],
            appState: {
              viewBackgroundColor: "#ffffff",
            },
          }}
        />
      </div>
    </div>
  );
};

export default CollaborativeBoard;