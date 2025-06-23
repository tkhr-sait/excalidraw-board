import React, { useState } from 'react';

interface CollaborationFooterProps {
  isCollaborating: boolean;
  isConnected: boolean;
  roomId: string;
  userName: string;
  connectionCount: number;
  onGenerateNewUserName?: () => string;
  onRoomChange?: (roomId: string) => void;
  onUserNameChange?: (userName: string) => void;
  onStartCollaboration?: () => void;
  onStopCollaboration?: () => void;
  onGenerateNewRoomName?: () => string;
}

export const CollaborationFooter: React.FC<CollaborationFooterProps> = ({
  isCollaborating,
  isConnected,
  roomId,
  userName,
  connectionCount,
  onGenerateNewUserName,
  onRoomChange,
  onUserNameChange,
  onStartCollaboration,
  onStopCollaboration,
  onGenerateNewRoomName,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempRoomId, setTempRoomId] = useState(roomId);
  const [tempUserName, setTempUserName] = useState(userName);

  // Keep temp values in sync when props change
  React.useEffect(() => {
    setTempRoomId(roomId);
  }, [roomId]);

  React.useEffect(() => {
    setTempUserName(userName);
  }, [userName]);

  // Note: Collaboration toggle is now handled by LiveCollaborationTrigger
  // const handleToggleCollaboration = () => {
  //   if (isCollaborating) {
  //     onStopCollaboration?.();
  //   } else {
  //     onStartCollaboration?.();
  //   }
  // };

  const handleApplySettings = () => {
    onRoomChange?.(tempRoomId);
    onUserNameChange?.(tempUserName);
    setShowSettings(false);
    // Note: Collaboration start/stop is now handled by LiveCollaborationTrigger
  };

  if (showSettings) {
    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowSettings(false)}
        >
          {/* Settings Dialog */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '400px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
              コラボレーション設定
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                marginBottom: '6px', 
                fontWeight: '500' 
              }}>
                ルーム名
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={tempRoomId}
                  onChange={(e) => setTempRoomId(e.target.value)}
                  placeholder="ルーム名を入力"
                  data-testid="room-input"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => setTempRoomId(onGenerateNewRoomName?.() || tempRoomId)}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                  }}
                  title="ランダムなルーム名を生成"
                >
                  🎲
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                marginBottom: '6px', 
                fontWeight: '500' 
              }}>
                ユーザー名
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value)}
                  placeholder="ユーザー名を入力"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => setTempUserName(onGenerateNewUserName?.() || tempUserName)}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                  }}
                  title="ランダムなユーザー名を生成"
                >
                  🎲
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleApplySettings}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                適用
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

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
      {/* Collaboration Status - Main toggle now handled by LiveCollaborationTrigger */}
      {isCollaborating && (
        <div 
          style={{
            padding: '6px 12px',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            border: '1px solid #bbdefb',
            borderRadius: '4px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>🔗</span>
          コラボレーション中
        </div>
      )}

      {/* Connection Status */}
      {isCollaborating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="collaboration-status">
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#28a745' : '#dc3545',
            }}
          />
          <span>{isConnected ? '接続済み' : '接続中'}</span>
        </div>
      )}

      {/* Room Info */}
      {isCollaborating && (
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
          <span data-testid="connection-count">👥 {connectionCount}名</span>
        </div>
      )}

      {/* Settings and Actions */}
      {isCollaborating && (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            ⚙️ 設定
          </button>
          <button
            style={{
              padding: '6px 10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            📋 URLコピー
          </button>
        </div>
      )}
    </div>
  );
};