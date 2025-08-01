import { useCallback, useEffect, useState } from 'react';
import { SyncPortal, type SyncableElement } from '../services/sync-portal';
import { socketService } from '../services/socket';
import { WS_SUBTYPES } from '../types/socket';

export interface CollaborationAPI {
  syncPortal: SyncPortal;
  
  // シーン同期 - 公式と同じAPI
  syncElements: (elements: readonly SyncableElement[], files?: any) => void;
  broadcastScene: (elements: readonly SyncableElement[], syncAll?: boolean, files?: any) => void;
  broadcastSceneUpdate: (elements: readonly SyncableElement[], files?: any) => void;
  
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
  
  // Version tracking
  setLastReceivedSceneVersion: (elements: SyncableElement[]) => void;
}

export function useCollaboration(): CollaborationAPI {
  const [syncPortal] = useState(() => new SyncPortal(socketService));
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [lastBroadcastedVersion, setLastBroadcastedVersion] = useState(-1);

  // 改善されたsyncElements実装（要素数とハッシュによる変化検知）
  const syncElements = useCallback((elements: readonly SyncableElement[], files?: any) => {
    if (!isCollaborating) return;
    
    const currentVersion = Math.max(...elements.map(el => el.version || 0), 0);
    const elementCount = elements.length;
    
    // 要素のハッシュを生成（IDと更新時刻ベース）
    const elementsHash = elements.map(el => `${el.id}:${el.updated || el.version}`).sort().join('|');
    const lastHash = (syncPortal as any).lastElementsHash;
    
    // バージョンチェック：新しい要素のみブロードキャスト
    // 初回、バージョン変更、要素数変化、要素内容変化のいずれかで送信
    const shouldBroadcast = lastBroadcastedVersion === -1 || 
                           currentVersion > lastBroadcastedVersion ||
                           elementCount !== (syncPortal as any).lastElementCount ||
                           elementsHash !== lastHash;
    
    if (shouldBroadcast) {
      const reason = lastBroadcastedVersion === -1 ? 'initial' : 
                    currentVersion > lastBroadcastedVersion ? 'version_change' : 
                    elementCount !== (syncPortal as any).lastElementCount ? 'element_count_change' : 'content_change';
      
      console.log('Broadcasting elements via syncElements:', {
        elementCount: elements.length,
        currentVersion,
        lastBroadcastedVersion,
        forceInitial: lastBroadcastedVersion === -1,
        reason,
        elementsChanged: elementsHash !== lastHash,
        filesIncluded: files ? Object.keys(files).length : 0
      });
      
      // 詳細な要素情報をログ出力
      const elementDetails = elements.map(el => ({
        id: el.id?.substring(0, 8) + '...',
        type: el.type,
        version: el.version,
        updated: el.updated
      }));
      console.log('Broadcasting element details:', elementDetails);
      
      // 初回の場合はINITとして送信、それ以外はUPDATE
      const messageType = lastBroadcastedVersion === -1 ? WS_SUBTYPES.INIT : WS_SUBTYPES.UPDATE;
      syncPortal.broadcastScene(messageType, elements, lastBroadcastedVersion === -1, files);
      setLastBroadcastedVersion(currentVersion);
      
      // 要素数とハッシュを記録
      (syncPortal as any).lastElementCount = elementCount;
      (syncPortal as any).lastElementsHash = elementsHash;
    }
  }, [syncPortal, isCollaborating, lastBroadcastedVersion]);

  // シーン全体のブロードキャスト
  const broadcastScene = useCallback((
    elements: readonly SyncableElement[], 
    syncAll: boolean = false,
    files?: any
  ) => {
    if (!isCollaborating) return;
    
    syncPortal.broadcastScene(
      syncAll ? WS_SUBTYPES.INIT : WS_SUBTYPES.UPDATE,
      elements,
      syncAll,
      files
    );
    
    const currentVersion = Math.max(...elements.map(el => el.version || 0), 0);
    setLastBroadcastedVersion(Math.max(lastBroadcastedVersion, currentVersion));
  }, [syncPortal, isCollaborating, lastBroadcastedVersion]);

  // インクリメンタル更新
  const broadcastSceneUpdate = useCallback((elements: readonly SyncableElement[], files?: any) => {
    if (!isCollaborating) return;
    
    const currentVersion = Math.max(...elements.map(el => el.version));
    
    // バージョンが変更された場合のみ送信
    if (currentVersion > lastBroadcastedVersion) {
      syncPortal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false, files);
      setLastBroadcastedVersion(currentVersion);
      
      // 定期的な全体同期のスケジュール
      syncPortal.queueBroadcastAllElements(elements);
    }
  }, [syncPortal, isCollaborating, lastBroadcastedVersion]);

  // マウス位置のブロードキャスト (Excalidraw style throttled)
  const broadcastMouseLocation = useCallback((
    pointer: { x: number; y: number }, 
    button: 'up' | 'down' = 'up',
    username?: string,
    selectedElementIds?: readonly string[]
  ) => {
    if (!isCollaborating) return;
    
    // Throttle mouse location broadcasts to reduce network overhead
    syncPortal.broadcastMouseLocation({
      pointer,
      button,
      selectedElementIds: selectedElementIds || [],
      username: username || 'Anonymous',
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

  // Track last received scene version
  const [, setLastReceivedSceneVersion] = useState(-1);

  // Track last received scene version
  const updateLastReceivedSceneVersion = useCallback((elements: SyncableElement[]) => {
    const maxVersion = Math.max(...elements.map(el => el.version || 0), 0);
    setLastReceivedSceneVersion(maxVersion);
  }, []);

  return {
    syncPortal,
    syncElements,
    broadcastScene,
    broadcastSceneUpdate,
    broadcastMouseLocation,
    broadcastIdleStatus,
    isCollaborating,
    roomKey,
    lastBroadcastedVersion,
    startCollaboration,
    stopCollaboration,
    setLastReceivedSceneVersion: updateLastReceivedSceneVersion,
  };
}