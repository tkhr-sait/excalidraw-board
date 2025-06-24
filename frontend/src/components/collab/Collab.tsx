import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import throttle from 'lodash.throttle';
import { useSocket } from '../../hooks/useSocket';
import { SyncPortal } from '../../services/sync-portal';
import { socketService } from '../../services/socket';
import { isSyncableElement } from '../../utils/element-sync';
import type { CollaborationState, RoomFormData } from '../../types/collaboration';
import type { RoomUser, SocketUpdateData } from '../../types/socket';
import { WS_SUBTYPES } from '../../types/socket';
import { CollabToolbar } from './CollabToolbar';
import { CollaboratorsList } from './CollaboratorsList';
import { RoomDialog } from './RoomDialog';
import './Collab.css';

// Generate deterministic encryption key from room ID so all users have the same key
function generateDeterministicKey(roomId: string): string {
  // Use a simple hash function to generate a deterministic key from room ID
  // In production, this should be more secure
  const hash = roomId.split('').reduce((a, b) => {
    a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
    return a < 0 ? a * -1 : a;
  }, 0);
  
  // Generate a 64-character hex string (32 bytes)
  return hash.toString(16).padStart(8, '0').repeat(8);
}

interface CollabProps {
  onCollaborationStateChange?: (isCollaborating: boolean, roomKey?: string, roomId?: string, username?: string) => void;
  onCollaboratorsChange?: (collaborators: RoomUser[]) => void;
  onSceneUpdate?: (data: { elements: any[]; appState: any }) => void;
  onPointerUpdate?: (data: { userId: string; x: number; y: number; username?: string; selectedElementIds?: readonly string[] }) => void;
}

export interface CollabHandle {
  broadcastSceneUpdate: (elements: any[], appState: any) => Promise<void>;
  broadcastPointerUpdate: (x: number, y: number, selectedElementIds?: readonly string[]) => Promise<void>;
  joinRoom: (data: RoomFormData) => void;
  leaveRoom: () => void;
  updateUsername: (newUsername: string) => void;
  getState: () => CollaborationState;
}

export const Collab = forwardRef<CollabHandle, CollabProps>(({ 
  onCollaborationStateChange,
  onCollaboratorsChange,
  onSceneUpdate,
  onPointerUpdate
}, ref) => {
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
    // Handle init-room event (Excalidraw style)
    const handleInitRoom = () => {
      console.log('Room initialized');
      socketService.markSocketInitialized();
    };

    // Handle new-user event
    const handleNewUser = (socketId: string) => {
      console.log('New user joined:', socketId);
      // Broadcast full scene to the new user (like Excalidraw)
      if (state.isInRoom && roomKey) {
        // Signal parent to broadcast full scene
        window.dispatchEvent(new CustomEvent('broadcastFullScene'));
      }
    };

    // Handle room-user-change event
    const handleRoomUserChange = (clients: string[]) => {
      console.log('Room users changed:', clients);
      // Update collaborators based on socket IDs
      setState(prev => ({
        ...prev,
        isInRoom: true,
        roomId: prev.roomId || 'default',
        collaborators: clients.map(id => ({
          id,
          username: id === socketService.socket?.id ? (prev.username || 'You') : `User ${id.slice(0, 6)}`,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        })),
        isConnecting: false,
        error: null,
      }));
      
      // Notify about collaborator changes
      const collaborators = clients.map(id => ({
        id,
        username: id === socketService.socket?.id ? (state.username || 'You') : `User ${id.slice(0, 6)}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }));
      onCollaboratorsChange?.(collaborators);
      
      // Use deterministic room key based on room ID for all users
      if (!roomKey && clients.length > 0) {
        const currentRoomId = state.roomId || 'default';
        const currentUsername = state.username || 'Anonymous';
        
        // Generate deterministic key from room ID so all users have the same key
        const deterministicKey = generateDeterministicKey(currentRoomId);
        console.log('Room user change, setting deterministic room key for room:', currentRoomId);
        setRoomKey(deterministicKey);
        socketService.setRoomKey(deterministicKey);
        setShowRoomDialog(false);
        onCollaborationStateChange?.(true, deterministicKey, currentRoomId, currentUsername);
      } else if (roomKey) {
        // If room key already exists, just close dialog and update state
        setShowRoomDialog(false);
        const currentRoomId = state.roomId || 'default';
        const currentUsername = state.username || 'Anonymous';
        onCollaborationStateChange?.(true, roomKey, currentRoomId, currentUsername);
      }
    };

    // Handle first-in-room event
    const handleFirstInRoom = () => {
      console.log('First user in room');
      const roomId = state.roomId || 'default';
      const username = state.username || 'Anonymous';
      
      setState(prev => ({
        ...prev,
        isInRoom: true,
        roomId: roomId,
        username: username,
        collaborators: [{
          id: socketService.socket?.id || '',
          username: username,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        }],
        isConnecting: false,
        error: null,
      }));
      setShowRoomDialog(false);
      
      // Initialize deterministic room key and notify collaboration state
      if (!roomKey) {
        const deterministicKey = generateDeterministicKey(roomId);
        console.log('First in room, setting deterministic room key for room:', roomId);
        setRoomKey(deterministicKey);
        socketService.setRoomKey(deterministicKey);
        onCollaborationStateChange?.(true, deterministicKey, roomId, username);
      } else {
        onCollaborationStateChange?.(true, roomKey, roomId, username);
      }
      
      onCollaboratorsChange?.([{
        id: socketService.socket?.id || '',
        username: username,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }]);
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
          console.log(`Received scene ${decryptedData.type}:`, decryptedData.payload.elements.length, 'elements');
          
          // Debug: Log received element dimensions
          const receivedElements = decryptedData.payload.elements.map((el: any) => ({
            id: el.id?.substring(0, 8) + '...' || 'unknown',
            type: el.type || 'unknown', 
            dimensions: `${el.width || 0}x${el.height || 0}`,
            position: `(${el.x || 0}, ${el.y || 0})`,
            isDeleted: el.isDeleted || false,
            version: el.version || 0,
            updated: el.updated || 'none'
          }));
          console.log('Received elements details:', receivedElements);
          
          // Filter and validate elements before updating (including deleted elements within timeout)
          const validElements = decryptedData.payload.elements.filter((el: any) => {
            // Basic validation: must have id, type, and valid position
            const hasBasicData = el && el.id && el.type && 
                   typeof el.x === 'number' && typeof el.y === 'number';
            
            if (!hasBasicData) {
              if (el) {
                console.log('Filtered out element with invalid basic data:', {
                  id: el.id,
                  type: el.type,
                  hasValidPosition: typeof el.x === 'number' && typeof el.y === 'number'
                });
              }
              return false;
            }
            
            // Use isSyncableElement to handle deletion timeout logic properly
            const isSyncable = isSyncableElement(el);
            if (!isSyncable && el.isDeleted) {
              console.log('Filtered out expired deleted element:', {
                id: el.id,
                type: el.type,
                isDeleted: el.isDeleted,
                updated: el.updated,
                age: el.updated ? (Date.now() - el.updated) / (1000 * 60 * 60) + ' hours' : 'unknown'
              });
            }
            
            return isSyncable;
          });
          
          console.log('Valid elements to update:', validElements.length, 'out of', decryptedData.payload.elements.length);
          
          // Enhanced element details for valid elements
          if (validElements.length > 0) {
            const validElementDetails = validElements.map((el: any) => ({
              id: el.id?.substring(0, 8) + '...',
              type: el.type,
              version: el.version,
              isComplete: !!(el.width && el.height)
            }));
            console.log('Sending valid elements to App:', validElementDetails);
          }
          
          // Always call onSceneUpdate to trigger reconciliation
          onSceneUpdate?.({
            elements: validElements,
            appState: {
              collaborators: new Map(),
              ...decryptedData.payload.appState
            }
          });
          break;
        case WS_SUBTYPES.MOUSE_LOCATION:
          // マウス位置の更新処理
          console.log('Mouse location update:', decryptedData.payload);
          onPointerUpdate?.({
            userId: decryptedData.payload.socketId,
            x: decryptedData.payload.pointer.x,
            y: decryptedData.payload.pointer.y,
            username: decryptedData.payload.username,
            selectedElementIds: decryptedData.payload.selectedElementIds
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

    // イベントリスナー登録 (Excalidraw style)
    socket.on('init-room', handleInitRoom);
    socket.on('new-user', handleNewUser);
    socket.on('room-user-change', handleRoomUserChange);
    socket.on('first-in-room', handleFirstInRoom);
    socket.on('error', handleError);
    socket.on('client-broadcast', handleClientBroadcast);

    // クリーンアップ
    return () => {
      socket.off('init-room');
      socket.off('new-user');
      socket.off('room-user-change');
      socket.off('first-in-room');
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
      roomId: data.roomId,  // Store room ID immediately
    }));
    
    try {
      socket.joinRoom(data.roomId, data.username);
      
      // Force collaboration state change for URL login scenario
      // This ensures that even if socket events don't fire immediately,
      // the collaboration state is activated
      const deterministicKey = generateDeterministicKey(data.roomId);
      setRoomKey(deterministicKey);
      socketService.setRoomKey(deterministicKey);
      
      setState(prev => ({
        ...prev,
        isInRoom: true,
        isConnecting: false,
        error: null,
      }));
      
      console.log('Calling onCollaborationStateChange with:', {
        collaborating: true,
        roomKey: deterministicKey,
        roomId: data.roomId,
        username: data.username
      });
      onCollaborationStateChange?.(true, deterministicKey, data.roomId, data.username);
      console.log('onCollaborationStateChange called successfully');
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

  // Broadcast scene update via encrypted channel
  const broadcastSceneUpdate = useCallback(async (elements: any[], appState: any) => {
    if (!state.isInRoom || !roomKey || !state.roomId) return;

    // Debug: Log element dimensions before broadcasting
    const debugElements = elements.map(el => ({
      id: el.id?.substring(0, 8) + '...' || 'unknown',
      type: el.type || 'unknown',
      dimensions: `${el.width || 0}x${el.height || 0}`,
      position: `(${el.x || 0}, ${el.y || 0})`,
      isDeleted: el.isDeleted || false,
      version: el.version || 0,
      versionNonce: el.versionNonce || 0
    }));
    console.log('Broadcasting elements:', debugElements);

    // Filter elements using isSyncableElement (includes deleted elements within timeout)
    const syncableElements = elements.filter(el => {
      if (!el || !el.id) {
        return false;
      }
      return isSyncableElement(el);
    });
    
    console.log('Broadcasting elements:', {
      total: elements.length,
      syncable: syncableElements.length,
      deleted: syncableElements.filter(el => el.isDeleted).length,
      active: syncableElements.filter(el => !el.isDeleted).length
    });

    const data: SocketUpdateData = {
      type: WS_SUBTYPES.UPDATE,
      payload: {
        elements: syncableElements,
        appState
      }
    };

    await socketService.broadcastEncryptedData(data, false, state.roomId);
  }, [state.isInRoom, state.roomId, roomKey]);

  // Broadcast pointer update via volatile encrypted channel (throttled like Excalidraw)
  const broadcastPointerUpdate = useCallback(throttle(async (x: number, y: number, selectedElementIds?: readonly string[]) => {
    if (!state.isInRoom || !roomKey || !state.roomId) return;

    const data: SocketUpdateData = {
      type: WS_SUBTYPES.MOUSE_LOCATION,
      payload: {
        socketId: socketService.socket?.id || '',
        pointer: { x, y },
        button: 'up',
        selectedElementIds: selectedElementIds || [],
        username: state.username || 'Anonymous'
      }
    };

    await socketService.broadcastEncryptedData(data, true, state.roomId);
  }, 16), [state.isInRoom, state.roomId, state.username, roomKey]); // 16ms throttle like Excalidraw's CURSOR_SYNC_TIMEOUT

  // ユーザー名更新処理
  const handleUpdateUsername = useCallback((newUsername: string) => {
    if (!state.isInRoom) {
      console.warn('Cannot update username: not in a room');
      return;
    }

    setState(prev => ({
      ...prev,
      username: newUsername,
    }));

    // Update the room with new username
    if (state.roomId) {
      socket.updateUsername(state.roomId, newUsername);
      console.log('Username updated in room:', { roomId: state.roomId, newUsername });
    }
  }, [socket, state.isInRoom, state.roomId]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    broadcastSceneUpdate,
    broadcastPointerUpdate,
    joinRoom: handleJoinRoom,
    leaveRoom: handleLeaveRoom,
    updateUsername: handleUpdateUsername,
    getState: () => state
  }), [broadcastSceneUpdate, broadcastPointerUpdate, handleJoinRoom, handleLeaveRoom, handleUpdateUsername, state]);

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
});