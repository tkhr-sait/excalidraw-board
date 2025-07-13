import { useState, useEffect, type FormEvent } from 'react';
import type { RoomFormData } from '../../types/collaboration';
import { generateRandomRoomName, getOrCreateUsername, saveUsername } from '../../utils/random-names';
import './RoomDialog.css';

interface ShareDialogProps {
  isOpen: boolean;
  isConnecting: boolean;
  error: string | null;
  onJoin: (data: RoomFormData) => void;
  onClose: () => void;
  onLeave: () => void;
  onUpdateUsername: (username: string) => void;
  
  // Collaboration state
  isCollaborating: boolean;
  currentRoomId?: string | null;
  currentUsername?: string | null;
  collaborators: Array<{ id: string; username: string; color: string }>;
}

export function ShareDialog({
  isOpen,
  isConnecting,
  error,
  onJoin,
  onClose,
  onLeave,
  onUpdateUsername,
  isCollaborating,
  currentRoomId,
  currentUsername,
  collaborators,
}: ShareDialogProps) {
  const [formData, setFormData] = useState<RoomFormData>({
    roomId: '',
    username: '',
  });
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  // ダイアログが開かれた時に値を設定
  useEffect(() => {
    if (isOpen) {
      if (isCollaborating) {
        setNewUsername(currentUsername || '');
      } else {
        setFormData({
          roomId: formData.roomId || generateRandomRoomName(),
          username: formData.username || getOrCreateUsername(),
        });
      }
    }
  }, [isOpen, isCollaborating, currentUsername]);

  if (!isOpen) return null;

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.roomId.trim() && formData.username.trim()) {
      saveUsername(formData.username.trim());
      onJoin(formData);
    }
  };

  const handleUsernameUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (newUsername.trim()) {
      saveUsername(newUsername.trim());
      onUpdateUsername(newUsername.trim());
      setEditingUsername(false);
    }
  };

  const handleChange = (field: keyof RoomFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const copyRoomLink = () => {
    if (currentRoomId) {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
      navigator.clipboard.writeText(roomUrl).then(() => {
        console.log('Room link copied to clipboard');
        // Could add a toast notification here
      }).catch(err => {
        console.error('Failed to copy room link:', err);
      });
    }
  };

  const generateShareableLink = () => {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${formData.roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      console.log('Shareable link copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy shareable link:', err);
    });
  };

  return (
    <div className="room-dialog-overlay" onClick={onClose}>
      <div className="room-dialog" onClick={e => e.stopPropagation()}>
        {isCollaborating ? (
          // Already collaborating - show active room dialog
          <div className="active-room-dialog">
            <h2 className="room-dialog-title">Collaboration Active</h2>
            
            <div className="room-info">
              <div className="info-group">
                <label>Room ID</label>
                <div className="room-id-display">
                  <span className="room-id">{currentRoomId}</span>
                  <button 
                    type="button" 
                    onClick={copyRoomLink}
                    className="copy-button"
                    title="Copy room link"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="info-group">
                <label>Your Username</label>
                {editingUsername ? (
                  <form onSubmit={handleUsernameUpdate} className="username-edit-form">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter new username"
                      autoFocus
                      required
                    />
                    <div className="username-edit-actions">
                      <button type="submit" className="save-button">Save</button>
                      <button 
                        type="button" 
                        onClick={() => setEditingUsername(false)}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="username-display">
                    <span className="username">{currentUsername}</span>
                    <button 
                      type="button" 
                      onClick={() => setEditingUsername(true)}
                      className="edit-button"
                      title="Edit username"
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>
              
              <div className="info-group">
                <label>Collaborators ({collaborators.length})</label>
                <div className="collaborators-list">
                  {collaborators.map(collaborator => (
                    <div key={collaborator.id} className="collaborator-item">
                      <div 
                        className="collaborator-color" 
                        style={{ backgroundColor: collaborator.color }}
                      ></div>
                      <span className="collaborator-name">
                        {collaborator.username}
                        {collaborator.username === currentUsername && ' (You)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            
            <div className="form-actions">
              <button
                type="button"
                onClick={copyRoomLink}
                className="secondary-button"
              >
                Copy Room Link
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="danger-button"
              >
                Stop Session
              </button>
              <button
                type="button"
                onClick={onClose}
                className="primary-button"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          // Not collaborating - show join/create dialog
          <div className="join-room-dialog">
            <h2 className="room-dialog-title">Share & Collaborate</h2>
            
            <form onSubmit={handleJoinSubmit} className="room-form">
              <div className="form-group">
                <label htmlFor="roomId">Room ID</label>
                <input
                  id="roomId"
                  type="text"
                  placeholder="Enter room ID"
                  value={formData.roomId}
                  onChange={handleChange('roomId')}
                  disabled={isConnecting}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="username">Your Name</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your name"
                  value={formData.username}
                  onChange={handleChange('username')}
                  disabled={isConnecting}
                  required
                />
              </div>
              
              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={generateShareableLink}
                  className="secondary-button"
                  disabled={!formData.roomId.trim() || !formData.username.trim()}
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isConnecting}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || !formData.roomId.trim() || !formData.username.trim()}
                  className="join-button primary-button"
                >
                  {isConnecting ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}