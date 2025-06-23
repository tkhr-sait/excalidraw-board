import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <div 
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        padding: '5px 10px',
        borderRadius: 5,
        backgroundColor: isConnected ? '#4caf50' : '#f44336',
        color: 'white',
        fontSize: 12,
        zIndex: 1000,
      }}
    >
      {isConnected ? '接続中' : '未接続'}
    </div>
  );
};