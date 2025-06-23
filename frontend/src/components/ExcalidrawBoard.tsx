import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { config } from '../config/environment';
import { ConnectionStatus } from './ConnectionStatus';

export const ExcalidrawBoard: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const { isConnected, sendMessage } = useWebSocket(config.websocketUrl);

  return (
    <div 
      data-testid="excalidraw-board"
      style={{ height: '100vh', width: '100vw', position: 'relative' }}
    >
      <ConnectionStatus isConnected={isConnected} />
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        theme="light"
        name="excalidraw-board"
      />
    </div>
  );
};