import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import type { CollaborationState, RoomFormData } from '../../types/collaboration';
import type { RoomData, RoomUser } from '../../types/socket';
import { CollabToolbar } from './CollabToolbar';
import { CollaboratorsList } from './CollaboratorsList';
import { RoomDialog } from './RoomDialog';
import './Collab.css';

interface CollabProps {
  onCollaborationStateChange?: (isCollaborating: boolean) => void;
  onCollaboratorsChange?: (collaborators: RoomUser[]) => void;
}

export function Collab({ 
  onCollaborationStateChange,
  onCollaboratorsChange 
}: CollabProps) {
  const socket = useSocket();
  const [state, setState] = useState<CollaborationState>({
    isInRoom: false,
    roomId: null,
    username: null,
    collaborators: [],
    isConnecting: false,
    error: null,
  });
  const [showRoomDialog, setShowRoomDialog] = useState(false);

  // Socketイベントハンドラの設定
  useEffect(() => {
    const handleRoomJoined = (data: RoomData) => {
      setState(prev => ({
        ...prev,
        isInRoom: true,
        roomId: data.roomId,
        collaborators: data.users,
        isConnecting: false,
        error: null,
      }));
      setShowRoomDialog(false);
      onCollaborationStateChange?.(true);
      onCollaboratorsChange?.(data.users);
    };

    const handleUserJoined = (user: RoomUser) => {
      setState(prev => ({
        ...prev,
        collaborators: [...prev.collaborators, user],
      }));
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      setState(prev => ({
        ...prev,
        collaborators: prev.collaborators.filter(u => u.id !== userId),
      }));
    };

    const handleError = ({ message }: { message: string }) => {
      setState(prev => ({
        ...prev,
        error: message,
        isConnecting: false,
      }));
    };

    // イベントリスナー登録
    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('error', handleError);

    // クリーンアップ
    return () => {
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('error');
    };
  }, [socket, onCollaborationStateChange, onCollaboratorsChange]);

  // コラボレーターの変更を通知
  useEffect(() => {
    onCollaboratorsChange?.(state.collaborators);
  }, [state.collaborators, onCollaboratorsChange]);

  // ルーム参加処理
  const handleJoinRoom = useCallback((data: RoomFormData) => {
    // ソケットが接続されていない場合のエラーハンドリング
    if (!socket.isConnected) {
      setState(prev => ({
        ...prev,
        error: 'Socket is not connected. Please check your connection and try again.',
        isConnecting: false,
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null,
      username: data.username,
    }));
    
    try {
      socket.joinRoom(data.roomId, data.username);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [socket]);

  // ルーム退出処理
  const handleLeaveRoom = useCallback(() => {
    if (state.roomId) {
      socket.leaveRoom(state.roomId);
      setState({
        isInRoom: false,
        roomId: null,
        username: null,
        collaborators: [],
        isConnecting: false,
        error: null,
      });
      onCollaborationStateChange?.(false);
      onCollaboratorsChange?.([]);
    }
  }, [state.roomId, socket, onCollaborationStateChange, onCollaboratorsChange]);

  // ルームダイアログを開く
  const handleOpenRoomDialog = useCallback(() => {
    setShowRoomDialog(true);
  }, []);

  // ルームダイアログを閉じる
  const handleCloseRoomDialog = useCallback(() => {
    setShowRoomDialog(false);
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <div className="collab-container">
      <CollabToolbar
        isConnected={socket.isConnected}
        isInRoom={state.isInRoom}
        roomId={state.roomId}
        onJoinRoom={handleOpenRoomDialog}
        onLeaveRoom={handleLeaveRoom}
      />
      
      {state.isInRoom && (
        <CollaboratorsList 
          collaborators={state.collaborators}
          currentUserId={state.username || ''}
        />
      )}
      
      {showRoomDialog && (
        <RoomDialog
          isOpen={showRoomDialog}
          isConnecting={state.isConnecting}
          error={state.error}
          onJoin={handleJoinRoom}
          onClose={handleCloseRoomDialog}
        />
      )}
    </div>
  );
}