import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { SyncPortal } from '../../services/sync-portal';
import { socketService } from '../../services/socket';
import type { CollaborationState, RoomFormData } from '../../types/collaboration';
import type { RoomData, RoomUser } from '../../types/socket';
import { WS_SUBTYPES } from '../../types/socket';
import { CollabToolbar } from './CollabToolbar';
import { CollaboratorsList } from './CollaboratorsList';
import { RoomDialog } from './RoomDialog';
import './Collab.css';

interface CollabProps {
  onCollaborationStateChange?: (isCollaborating: boolean, roomKey?: string, roomId?: string, username?: string) => void;
  onCollaboratorsChange?: (collaborators: RoomUser[]) => void;
  onSceneUpdate?: (data: { elements: any[]; appState: any }) => void;
  onPointerUpdate?: (data: { userId: string; x: number; y: number }) => void;
}

export function Collab({ 
  onCollaborationStateChange,
  onCollaboratorsChange,
  onSceneUpdate,
  onPointerUpdate
}: CollabProps) {
  const socket = useSocket();
  const [syncPortal] = useState(() => new SyncPortal(socketService));
  const [state, setState] = useState<CollaborationState>({
    isInRoom: false,
    roomId: null,
    username: null,
    collaborators: [],
    isConnecting: false,
    error: null,
  });
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [roomKey, setRoomKey] = useState<string | null>(null);

  // Socketイベントハンドラの設定
  useEffect(() => {
    const handleRoomJoined = (data: RoomData) => {
      // Get username from the current user in the users list
      const currentUser = data.users.find(u => u.id === socketService.socket?.id);
      const username = currentUser?.username || state.username;
      
      setState(prev => ({
        ...prev,
        isInRoom: true,
        roomId: data.roomId,
        username: username,
        collaborators: data.users,
        isConnecting: false,
        error: null,
      }));
      setShowRoomDialog(false);
      
      // Excalidraw風の初期化: roomKeyを生成して設定
      if (!roomKey) {
        socketService.generateRoomKey().then(key => {
          console.log('Room joined, setting room key:', key);
          setRoomKey(key);
          // Pass the room key, room ID and username to the collaboration state change handler
          // Use the actual values from data, not from state (which might not be updated yet)
          console.log('Calling onCollaborationStateChange with:', { 
            roomId: data.roomId, 
            username: username,
            roomKey: key 
          });
          onCollaborationStateChange?.(true, key, data.roomId || undefined, username || undefined);
        });
      } else {
        console.log('Calling onCollaborationStateChange with existing key:', { 
          roomId: data.roomId, 
          username: username,
          roomKey: roomKey 
        });
        onCollaborationStateChange?.(true, roomKey, data.roomId || undefined, username || undefined);
      }
      
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

    // Excalidraw風の暗号化通信ハンドラ
    const handleClientBroadcast = async (encryptedData: ArrayBuffer, iv: Uint8Array) => {
      if (!roomKey) return;
      
      const decryptedData = await syncPortal.decryptPayload(iv, encryptedData, roomKey);
      if (!decryptedData) return;

      console.log('Received encrypted message:', decryptedData.type);

      switch (decryptedData.type) {
        case WS_SUBTYPES.INIT:
        case WS_SUBTYPES.UPDATE:
          // シーンデータの更新処理 - Appコンポーネントに通知
          console.log('Received scene update:', decryptedData.payload.elements.length, 'elements');
          onSceneUpdate?.({
            elements: [...decryptedData.payload.elements],
            appState: {}
          });
          break;
        case WS_SUBTYPES.MOUSE_LOCATION:
          // マウス位置の更新処理
          console.log('Mouse location update:', decryptedData.payload);
          onPointerUpdate?.({
            userId: decryptedData.payload.socketId,
            x: decryptedData.payload.pointer.x,
            y: decryptedData.payload.pointer.y
          });
          break;
        case WS_SUBTYPES.IDLE_STATUS:
          // アイドル状態の更新処理
          console.log('User idle status update:', decryptedData.payload);
          break;
        case WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS:
          // 可視範囲の更新処理
          console.log('Visible scene bounds update:', decryptedData.payload);
          break;
      }
    };

    // イベントリスナー登録
    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('error', handleError);
    socket.on('client-broadcast', handleClientBroadcast);

    // クリーンアップ
    return () => {
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('error');
      socket.off('client-broadcast');
    };
  }, [socket, syncPortal, roomKey, onCollaborationStateChange, onCollaboratorsChange, onSceneUpdate, onPointerUpdate]);

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