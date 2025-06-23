import React, { useState } from 'react';

interface CollaborationSettingsProps {
  isCollaborating: boolean;
  currentRoomId: string;
  currentUserName: string;
  onRoomChange: (roomId: string) => void;
  onUserNameChange: (userName: string) => void;
  onStartCollaboration: () => void;
  onStopCollaboration: () => void;
}

export const CollaborationSettings: React.FC<CollaborationSettingsProps> = ({
  isCollaborating,
  currentRoomId,
  currentUserName,
  onRoomChange,
  onUserNameChange,
  onStartCollaboration,
  onStopCollaboration,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempRoomId, setTempRoomId] = useState(currentRoomId);
  const [tempUserName, setTempUserName] = useState(currentUserName);

  const handleApplySettings = () => {
    onRoomChange(tempRoomId);
    onUserNameChange(tempUserName);
    setShowSettings(false);
  };

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

  return (
    <div style={{ position: 'relative' }}>
      {/* Main collaboration button */}
      <button
        onClick={handleToggleCollaboration}
        style={{
          padding: '8px 16px',
          backgroundColor: isCollaborating ? '#f44336' : '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 'bold',
          marginRight: 8,
        }}
      >
        {isCollaborating ? 'コラボ停止' : 'コラボ開始'}
      </button>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          padding: '8px 12px',
          backgroundColor: '#757575',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        ⚙️ 設定
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: 16,
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            zIndex: 1001,
            minWidth: 280,
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>コラボレーション設定</h4>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 'bold' }}>
              ルーム名:
            </label>
            <input
              type="text"
              value={tempRoomId}
              onChange={(e) => setTempRoomId(e.target.value)}
              placeholder="ルーム名を入力"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 'bold' }}>
              ユーザー名:
            </label>
            <input
              type="text"
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              placeholder="ユーザー名を入力"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleApplySettings}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              適用
            </button>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
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