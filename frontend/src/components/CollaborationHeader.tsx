import React, { useState } from 'react';

interface CollaborationHeaderProps {
  isCollaborating: boolean;
  isConnected: boolean;
  userName: string;
  roomId: string;
  connectionCount: number;
  onRoomChange: (roomId: string) => void;
  onUserNameChange: (userName: string) => void;
  onStartCollaboration: () => void;
  onStopCollaboration: () => void;
}

export const CollaborationHeader: React.FC<CollaborationHeaderProps> = ({
  isCollaborating,
  isConnected,
  userName,
  roomId,
  connectionCount,
  onRoomChange,
  onUserNameChange,
  onStartCollaboration,
  onStopCollaboration,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempRoomId, setTempRoomId] = useState(roomId);
  const [tempUserName, setTempUserName] = useState(userName);

  const handleToggleCollaboration = () => {
    if (isCollaborating) {
      onStopCollaboration();
    } else {
      // Apply settings before starting collaboration
      onRoomChange(tempRoomId);
      onUserNameChange(tempUserName);
      onStartCollaboration();
    }
  };

  const handleApplySettings = () => {
    onRoomChange(tempRoomId);
    onUserNameChange(tempUserName);
    setShowSettings(false);
  };

  const getUserInitial = () => {
    return userName ? userName.charAt(0).toUpperCase() : '?';
  };

  const shouldShowUserBadge = isCollaborating;
  const shouldShowConnectionBadge = isCollaborating && isConnected;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      {/* User initial badge - shows when collaborating */}
      {shouldShowUserBadge && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#ff69b4', // Pink color similar to the image
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
      )}

      {/* Share button with connection badge */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={handleToggleCollaboration}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4ade80', // Green color similar to the image
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '70px',
          }}
        >
          Share
        </button>

        {/* Connection count badge - shows when connected */}
        {shouldShowConnectionBadge && (
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#22c55e', // Darker green for the badge
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
      </div>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⚙️
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1001,
            minWidth: '280px',
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            コラボレーション設定
          </h4>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              marginBottom: '4px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              ルーム名:
            </label>
            <input
              type="text"
              value={tempRoomId}
              onChange={(e) => setTempRoomId(e.target.value)}
              placeholder="ルーム名を入力"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              marginBottom: '4px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              ユーザー名:
            </label>
            <input
              type="text"
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              placeholder="ユーザー名を入力"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleApplySettings}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              適用
            </button>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};