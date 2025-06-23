import React from 'react';

interface CollaborationTopRightUIProps {
  isCollaborating: boolean;
  isConnected: boolean;
  userName: string;
  connectionCount: number;
}

export const CollaborationTopRightUI: React.FC<CollaborationTopRightUIProps> = ({
  isCollaborating,
  isConnected,
  userName,
  connectionCount,
}) => {
  if (!isCollaborating) return null;

  const getUserInitial = () => {
    return userName ? userName.charAt(0).toUpperCase() : '?';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* User initial badge */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#ff69b4',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          userSelect: 'none',
        }}
      >
        {getUserInitial()}
      </div>

      {/* Share button with connection badge */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#4ade80',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '70px',
          }}
          title={`${connectionCount}名が接続中`}
        >
          Share
        </button>

        {/* Connection count badge */}
        {isConnected && (
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              border: '2px solid white',
              userSelect: 'none',
            }}
          >
            {connectionCount}
          </div>
        )}

        {/* Disconnected indicator */}
        {!isConnected && (
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#dc3545',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              border: '2px solid white',
              userSelect: 'none',
            }}
            title="接続が切断されています"
          >
            !
          </div>
        )}
      </div>
    </div>
  );
};