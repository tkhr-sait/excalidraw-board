import { useState, useCallback, useRef } from 'react';
import './EditableUsername.css';

interface EditableUsernameProps {
  username: string;
  onUsernameChange?: (newUsername: string) => void;
}

export function EditableUsername({ 
  username, 
  onUsernameChange 
}: EditableUsernameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (!onUsernameChange) return;
    setIsEditing(true);
    setEditValue(username);
    // Focus input after state update
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [username, onUsernameChange]);

  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== username && onUsernameChange) {
      onUsernameChange(trimmedValue);
    }
    setIsEditing(false);
  }, [editValue, username, onUsernameChange]);

  const handleCancel = useCallback(() => {
    setEditValue(username);
    setIsEditing(false);
  }, [username]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  if (isEditing) {
    return (
      <div className="editable-username editing">
        <span className="username-label">User:</span>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="username-input"
          maxLength={50}
          placeholder="Enter your name"
        />
      </div>
    );
  }

  return (
    <div 
      className={`editable-username ${onUsernameChange ? 'clickable' : ''}`}
      onClick={handleClick}
      title={onUsernameChange ? 'Click to edit your name' : undefined}
    >
      <span className="username-label">User:</span>
      <span className="username-value">{username}</span>
      {onUsernameChange && (
        <span className="edit-icon">✏️</span>
      )}
    </div>
  );
}