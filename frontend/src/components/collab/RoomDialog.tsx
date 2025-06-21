import { useState, useEffect, type FormEvent } from 'react';
import type { RoomFormData } from '../../types/collaboration';
import { generateRandomRoomName, getOrCreateUsername, saveUsername } from '../../utils/random-names';
import './RoomDialog.css';

interface RoomDialogProps {
  isOpen: boolean;
  isConnecting: boolean;
  error: string | null;
  onJoin: (data: RoomFormData) => void;
  onClose: () => void;
}

export function RoomDialog({
  isOpen,
  isConnecting,
  error,
  onJoin,
  onClose,
}: RoomDialogProps) {
  const [formData, setFormData] = useState<RoomFormData>({
    roomId: '',
    username: '',
  });

  // ダイアログが開かれた時に値を設定
  useEffect(() => {
    if (isOpen) {
      setFormData({
        roomId: formData.roomId || generateRandomRoomName(),
        username: formData.username || getOrCreateUsername(),
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.roomId.trim() && formData.username.trim()) {
      // ユーザー名を保存
      saveUsername(formData.username.trim());
      onJoin(formData);
    }
  };

  const handleChange = (field: keyof RoomFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="room-dialog-overlay" onClick={onClose}>
      <div className="room-dialog" onClick={e => e.stopPropagation()}>
        <h2 className="room-dialog-title">Join Collaboration Room</h2>
        
        <form onSubmit={handleSubmit} className="room-form">
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
              onClick={onClose}
              disabled={isConnecting}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting || !formData.roomId || !formData.username}
              className="join-button"
            >
              {isConnecting ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}