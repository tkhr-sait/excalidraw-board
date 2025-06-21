import { useCallback, useEffect, useState } from 'react';
import { SyncPortal, type SyncableElement } from '../services/sync-portal';
import { socketService } from '../services/socket';
import { WS_SUBTYPES } from '../types/socket';

export interface CollaborationAPI {
  syncPortal: SyncPortal;
  
  // シーン同期
  broadcastScene: (elements: readonly SyncableElement[], syncAll?: boolean) => void;
  broadcastSceneUpdate: (elements: readonly SyncableElement[]) => void;
  
  // マウス・ユーザー操作
  broadcastMouseLocation: (pointer: { x: number; y: number }, button?: 'up' | 'down') => void;
  broadcastIdleStatus: (status: 'active' | 'idle' | 'away', username: string) => void;
  
  // 状態管理
  isCollaborating: boolean;
  roomKey: string | null;
  lastBroadcastedVersion: number;
  
  // コラボレーション制御
  startCollaboration: (roomKey: string) => void;
  stopCollaboration: () => void;
}

export function useCollaboration(): CollaborationAPI {
  const [syncPortal] = useState(() => new SyncPortal(socketService));
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [lastBroadcastedVersion, setLastBroadcastedVersion] = useState(-1);

  // シーン全体のブロードキャスト
  const broadcastScene = useCallback((
    elements: readonly SyncableElement[], 
    syncAll: boolean = false
  ) => {
    if (!isCollaborating) return;
    
    syncPortal.broadcastScene(
      syncAll ? WS_SUBTYPES.INIT : WS_SUBTYPES.UPDATE,
      elements,
      syncAll
    );
    
    const currentVersion = Math.max(...elements.map(el => el.version));
    setLastBroadcastedVersion(Math.max(lastBroadcastedVersion, currentVersion));
  }, [syncPortal, isCollaborating, lastBroadcastedVersion]);

  // インクリメンタル更新
  const broadcastSceneUpdate = useCallback((elements: readonly SyncableElement[]) => {
    if (!isCollaborating) return;
    
    const currentVersion = Math.max(...elements.map(el => el.version));
    
    // バージョンが変更された場合のみ送信
    if (currentVersion > lastBroadcastedVersion) {
      syncPortal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false);
      setLastBroadcastedVersion(currentVersion);
      
      // 定期的な全体同期のスケジュール
      syncPortal.queueBroadcastAllElements(elements);
    }
  }, [syncPortal, isCollaborating, lastBroadcastedVersion]);

  // マウス位置のブロードキャスト
  const broadcastMouseLocation = useCallback((
    pointer: { x: number; y: number }, 
    button: 'up' | 'down' = 'up'
  ) => {
    if (!isCollaborating) return;
    
    syncPortal.broadcastMouseLocation({
      pointer,
      button,
      selectedElementIds: [], // TODO: 選択中の要素IDを渡す
      username: '', // TODO: ユーザー名を渡す
    });
  }, [syncPortal, isCollaborating]);

  // アイドル状態のブロードキャスト
  const broadcastIdleStatus = useCallback((
    status: 'active' | 'idle' | 'away',
    username: string
  ) => {
    if (!isCollaborating) return;
    
    syncPortal.broadcastIdleChange(status, username);
  }, [syncPortal, isCollaborating]);

  // コラボレーション状態の監視
  useEffect(() => {
    const connected = socketService.isConnected();
    // Only set collaboration state if we have a room key (actual collaboration)
    const shouldCollaborate = connected && roomKey !== null;
    setIsCollaborating(shouldCollaborate);
    console.log('Collaboration state:', { connected, roomKey, shouldCollaborate });
  }, [roomKey]);

  // コラボレーション開始
  const startCollaboration = useCallback((newRoomKey: string) => {
    console.log('Starting collaboration with room key:', newRoomKey);
    setRoomKey(newRoomKey);
    socketService.setRoomKey(newRoomKey);
    socketService.markSocketInitialized();
    setIsCollaborating(true);
  }, []);

  // コラボレーション停止
  const stopCollaboration = useCallback(() => {
    console.log('Stopping collaboration');
    setRoomKey(null);
    setIsCollaborating(false);
    setLastBroadcastedVersion(-1);
  }, []);

  return {
    syncPortal,
    broadcastScene,
    broadcastSceneUpdate,
    broadcastMouseLocation,
    broadcastIdleStatus,
    isCollaborating,
    roomKey,
    lastBroadcastedVersion,
    startCollaboration,
    stopCollaboration,
  };
}