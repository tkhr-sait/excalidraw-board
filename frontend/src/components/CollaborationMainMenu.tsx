import React, { useState } from 'react';

interface CollaborationMainMenuProps {
  isCollaborating: boolean;
  roomId: string;
  userName: string;
  onRoomChange: (roomId: string) => void;
  onUserNameChange: (userName: string) => void;
  onStartCollaboration: () => void;
  onStopCollaboration: () => void;
  onGenerateNewUserName: () => string;
  onGenerateNewRoomName: () => string;
}

export const CollaborationMainMenu: React.FC<CollaborationMainMenuProps> = ({
  isCollaborating,
  roomId,
  userName,
  onRoomChange,
  onUserNameChange,
  onStartCollaboration,
  onStopCollaboration,
  onGenerateNewUserName,
  onGenerateNewRoomName,
}) => {
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [tempRoomId, setTempRoomId] = useState(roomId);
  const [tempUserName, setTempUserName] = useState(userName);

  // Keep temp values in sync when props change
  React.useEffect(() => {
    setTempRoomId(roomId);
  }, [roomId]);

  React.useEffect(() => {
    setTempUserName(userName);
  }, [userName]);

  const handleToggleCollaboration = () => {
    if (isCollaborating) {
      onStopCollaboration();
    } else {
      onStartCollaboration();
    }
  };

  const handleJoinRoom = () => {
    onRoomChange(tempRoomId);
    onUserNameChange(tempUserName);
    setShowRoomDialog(false);
    if (!isCollaborating) {
      onStartCollaboration();
    }
  };

  if (showRoomDialog) {
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
          onClick={() => setShowRoomDialog(false)}
        >
          {/* Dialog */}
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
              ルーム設定
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
                  onClick={() => setTempRoomId(onGenerateNewRoomName())}
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
                  onClick={() => setTempUserName(onGenerateNewUserName())}
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
                onClick={() => setShowRoomDialog(false)}
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
                onClick={handleJoinRoom}
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
    <>
      {/* Collaboration Toggle Item */}
      <button
        onClick={handleToggleCollaboration}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '16px' }}>
          {isCollaborating ? '🔗' : '🔴'}
        </span>
        {isCollaborating ? 'コラボレーション停止' : 'コラボレーション開始'}
      </button>

      {/* Room Settings Item */}
      <button
        onClick={() => setShowRoomDialog(true)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '16px' }}>⚙️</span>
        ルーム設定
      </button>

      {/* Current Room Info (when collaborating) */}
      {isCollaborating && (
        <div
          style={{
            padding: '12px 16px',
            fontSize: '12px',
            color: '#6c757d',
            borderTop: '1px solid #eee',
          }}
        >
          <div>ルーム: {roomId}</div>
          <div>ユーザー: {userName}</div>
        </div>
      )}
    </>
  );
};