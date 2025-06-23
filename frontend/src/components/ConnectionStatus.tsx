import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  roomId?: string;
  userName?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  roomId, 
  userName 
}) => {
  return (
    <div 
      style={{
        position: 'absolute',
        top: 10,
        left: 10, // Changed from right to left to avoid Library button
        padding: '8px 12px',
        borderRadius: 6,
        backgroundColor: isConnected ? '#4caf50' : '#f44336',
        color: 'white',
        fontSize: 12,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        minWidth: '120px',
      }}
    >
      <div style={{ fontWeight: 'bold' }}>
        {isConnected ? '🟢 接続中' : '🔴 未接続'}
      </div>
      {roomId && (
        <div style={{ fontSize: 10, marginTop: 2, opacity: 0.9 }}>
          Room: {roomId}
        </div>
      )}
      {userName && (
        <div style={{ fontSize: 10, marginTop: 1, opacity: 0.9 }}>
          User: {userName}
        </div>
      )}
    </div>
  );
};