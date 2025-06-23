import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useState } from 'react';

export const ExcalidrawBoard: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  return (
    <div 
      data-testid="excalidraw-board"
      style={{ height: '100vh', width: '100vw' }}
    >
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        theme="light"
        name="excalidraw-board"
      />
    </div>
  );
};