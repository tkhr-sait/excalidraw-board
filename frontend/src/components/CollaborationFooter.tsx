import React from 'react';

interface CollaborationFooterProps {
  isCollaborating: boolean;
  isConnected: boolean;
  roomId: string;
  userName: string;
  connectionCount: number;
  onGenerateNewUserName?: () => string;
}

export const CollaborationFooter: React.FC<CollaborationFooterProps> = ({
  isCollaborating,
  isConnected,
  roomId,
  userName,
  connectionCount,
  onGenerateNewUserName,
}) => {
  if (!isCollaborating) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
        fontSize: '12px',
        color: '#6c757d',
      }}
    >
      {/* Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#28a745' : '#dc3545',
          }}
        />
        <span>{isConnected ? '接続中' : '切断'}</span>
      </div>

      {/* Room Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🏠 {roomId}</span>
        <span 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            cursor: onGenerateNewUserName ? 'pointer' : 'default'
          }}
          onClick={onGenerateNewUserName}
          title={onGenerateNewUserName ? 'クリックでユーザー名を変更' : undefined}
        >
          👤 {userName}
          {onGenerateNewUserName && (
            <span style={{ fontSize: '10px', opacity: 0.7 }}>🎲</span>
          )}
        </span>
        <span>👥 {connectionCount}名</span>
      </div>

      {/* Quick Actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        <button
          style={{
            padding: '4px 8px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
        >
          URLコピー
        </button>
      </div>
    </div>
  );
};