import { useCallback, useEffect, useState, useRef } from 'react';
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  LiveCollaborationTrigger,
  reconcileElements,
  restoreElements,
  getSceneVersion,
} from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  AppState,
  ExcalidrawImperativeAPI,
} from './types/excalidraw';
import type { RoomUser, CollaboratorPointer } from './types/socket';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/storage';
import { getOrCreateUsername, saveUsername } from './utils/random-names';
import { getSceneElementsIncludingDeleted, RecentlyDeletedElementsTracker } from './utils/element-sync';
import { Collab } from './components/collab/Collab';
import type { CollabHandle } from './components/collab/Collab';
import { CollabFooter } from './components/collab/CollabFooter';
import { CollabMobileMenu } from './components/collab/CollabMobileMenu';
import { RoomDialog } from './components/collab/RoomDialog';
import { ShareDialog } from './components/collab/ShareDialog';
import { useCollaboration } from './hooks/useCollaboration';
import { useSocket } from './hooks/useSocket';
import { throttle } from './utils/throttle';
import './App.css';

function App() {
  const socket = useSocket();
  const collaboration = useCollaboration();
  const [, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
  } | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<RoomUser[]>([]);
  const [, setCollaboratorPointers] = useState<
    Map<string, CollaboratorPointer>
  >(new Map());
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [roomDialogError, setRoomDialogError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingUrlJoin, setPendingUrlJoin] = useState<{roomId: string; username: string} | null>(null);

  // Excalidraw APIの参照を保持
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // Collab componentの参照を保持
  const collabRef = useRef<CollabHandle | null>(null);
  // Track last broadcasted/received scene version to prevent echo
  const lastBroadcastedOrReceivedSceneVersionRef = useRef<number>(-1);
  // Track recently deleted elements for proper sync
  const recentlyDeletedTracker = useRef(new RecentlyDeletedElementsTracker());
  const lastElementsRef = useRef<readonly ExcalidrawElement[]>([]);

  // URLパラメータからRoom情報を取得
  useEffect(() => {
    console.log('URL processing effect running...');
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    const usernameFromUrl = urlParams.get('username');
    
    console.log('URL params:', { roomIdFromUrl, usernameFromUrl, search: window.location.search });
    
    if (roomIdFromUrl) {
      // Use saved username or generate new one if not provided
      const username = usernameFromUrl || getOrCreateUsername();
      
      console.log('Setting up URL join for room:', roomIdFromUrl, 'username:', username);
      // URL経由でRoom参加 - 自動的にルームに参加するためのペンディング状態を設定
      setCurrentRoomId(roomIdFromUrl);
      setCurrentUsername(username);
      setPendingUrlJoin({ roomId: roomIdFromUrl, username: username });
      
      // URLパラメータをクリア（履歴汚染防止）
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      console.log('No URL parameters found for auto-join');
    }
  }, []);

  // Collab componentが準備できたらペンディング中のURL参加を処理
  useEffect(() => {
    console.log('Pending URL join effect check:', {
      pendingUrlJoin,
      hasCollabRef: !!collabRef.current,
      socketConnected: socket.isConnected
    });
    
    if (pendingUrlJoin && collabRef.current && socket.isConnected) {
      console.log('Auto-joining room from URL parameters:', pendingUrlJoin);
      setIsConnecting(true);
      setRoomDialogError(null);
      
      // Use a timeout to ensure all components are ready
      const timeoutId = setTimeout(() => {
        try {
          if (collabRef.current) {
            collabRef.current.joinRoom({
              roomId: pendingUrlJoin.roomId,
              username: pendingUrlJoin.username
            });
            console.log('joinRoom called successfully for URL login');
            
            // Set a timeout to check if collaboration started
            setTimeout(() => {
              if (!isCollaborating) {
                console.warn('URL join may have failed - collaboration not started after 2 seconds');
                // Don't clear pendingUrlJoin yet, let user try manually
                setIsConnecting(false);
                setShowRoomDialog(true);
              } else {
                console.log('URL join successful - collaboration started');
                setPendingUrlJoin(null); // ペンディング状態をクリア
              }
            }, 2000);
          }
        } catch (error) {
          console.error('Error joining room from URL:', error);
          setRoomDialogError(error instanceof Error ? error.message : 'Unknown error occurred');
          setIsConnecting(false);
          setShowRoomDialog(true); // エラー時はダイアログを表示
          setPendingUrlJoin(null);
        }
      }, 100); // Small delay to ensure components are ready
      
      return () => clearTimeout(timeoutId);
    } else if (pendingUrlJoin && !socket.isConnected) {
      console.log('Socket not connected yet, waiting for connection...');
    }
  }, [pendingUrlJoin, socket.isConnected, isCollaborating]);

  // 初期データの読み込み
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      setInitialData({
        elements: savedData.elements,
        appState: {
          ...savedData.appState,
          collaborators: new Map(),
        },
      });
    } else {
      setInitialData({
        elements: [],
        appState: {
          collaborators: new Map(),
        },
      });
    }
  }, []);

  // コラボレーション状態の同期
  useEffect(() => {
    setIsCollaborating(collaboration.isCollaborating);
  }, [collaboration.isCollaborating]);

  // デバッグ用: ソケット接続時に collaboration 状態をログ出力
  useEffect(() => {
    console.log('Collaboration state update:', {
      isCollaborating,
      socketConnected: socket.isConnected,
      collaborationState: collaboration.isCollaborating
    });
  }, [isCollaborating, socket.isConnected, collaboration.isCollaborating]);

  // ウィンドウタイトルの更新
  useEffect(() => {
    let title = 'Excalidraw Board';
    
    if (currentRoomId && currentUsername && isCollaborating) {
      title = `${title} - ${currentRoomId} - ${currentUsername}`;
    }
    
    document.title = title;
  }, [currentRoomId, currentUsername, isCollaborating]);

  // Socket events are now handled through encrypted broadcasts in Collab component

  // 公式方式: シンプルなremote scene update処理
  const handleRemoteSceneUpdate = useCallback((elements: any[]) => {
    const excalidrawAPI = excalidrawAPIRef.current;
    if (excalidrawAPI) {
      console.log('Official-style handleRemoteSceneUpdate:', elements.length, 'elements');
      
      // 公式方式: リモート更新を適用
      excalidrawAPI.updateScene({
        elements: elements as any,
      });
      
      console.log('Remote scene updated with CaptureUpdateAction.NEVER');
    }
  }, []);

  // 公式方式: reconciliation処理
  const _reconcileElements = useCallback((remoteElements: any[]) => {
    const excalidrawAPI = excalidrawAPIRef.current;
    if (!excalidrawAPI) return [];
    
    console.log('Official-style _reconcileElements:', remoteElements.length, 'remote elements');
    
    const localElements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const restoredRemoteElements = restoreElements(remoteElements, null);
    
    console.log(`Reconciliation: ${localElements.length} local + ${remoteElements.length} remote`);
    
    const reconciledElements = reconcileElements(
      localElements as any,
      restoredRemoteElements as any,
      appState as any,
    );
    
    console.log(`Reconciled result: ${reconciledElements.length} elements`);
    
    // 公式方式: reconciliation前にバージョン設定でbroadcast防止
    const newSceneVersion = getSceneVersion(reconciledElements);
    lastBroadcastedOrReceivedSceneVersionRef.current = newSceneVersion;
    collaboration.setLastReceivedSceneVersion(reconciledElements);
    
    console.log('Set scene version to prevent re-broadcasting:', newSceneVersion);
    
    return reconciledElements;
  }, [collaboration]);

  // Collab コンポーネントからの同期データ受信（公式方式採用）
  const handleCollabSceneUpdate = useCallback((data: { elements: any[]; appState: any }) => {
    console.log('Received scene update from Collab:', data.elements.length, 'elements');
    
    // 公式方式: reconcile → handleRemoteSceneUpdate の順序
    const reconciledElements = _reconcileElements(data.elements);
    if (reconciledElements.length >= 0) { // 0でも更新する
      handleRemoteSceneUpdate(reconciledElements);
    }
  }, [_reconcileElements, handleRemoteSceneUpdate]);

  const handleCollabPointerUpdate = useCallback(throttle((data: { userId: string; x: number; y: number; username?: string; selectedElementIds?: readonly string[] }) => {
    console.log('Received pointer update from Collab:', {
      userId: data.userId,
      position: { x: data.x, y: data.y },
      username: data.username,
      selectedElementIds: data.selectedElementIds,
      selectionCount: data.selectedElementIds?.length || 0
    });
    setCollaboratorPointers(prev => {
      const updated = new Map(prev);
      updated.set(data.userId, data);
      return updated;
    });

    // Update Excalidraw collaborators with pointer position and username
    if (excalidrawAPIRef.current) {
      const collaborator = collaborators.find(c => c.id === data.userId);
      const username = data.username || collaborator?.username || `User ${data.userId.slice(0, 6)}`;
      const color = collaborator?.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      
      const collaboratorsMap = new Map();
      collaboratorsMap.set(data.userId, {
        username: username,
        avatarUrl: null,
        color: {
          background: color,
          stroke: color,
        },
        pointer: {
          x: data.x,
          y: data.y,
        },
        selectedElementIds: data.selectedElementIds || [],
      });

      excalidrawAPIRef.current.updateScene({
        appState: {
          collaborators: collaboratorsMap,
        },
      });
    }
  }, 16), [collaborators]);

  // 公式方式: CaptureUpdateAction.NEVERにより複雑なフラグ管理は不要
  
  // Handle broadcasting full scene when new user joins
  useEffect(() => {
    const handleBroadcastFullScene = () => {
      if (isCollaborating && collabRef.current && excalidrawAPIRef.current) {
        // Get elements including recently deleted ones for proper sync
        const elementsIncludingDeleted = getSceneElementsIncludingDeleted(
          excalidrawAPIRef.current,
          recentlyDeletedTracker.current.getRecentlyDeletedElements()
        );
        console.log('Broadcasting full scene to new user:', elementsIncludingDeleted.length, 'elements (including recently deleted)');
        // Force sync all elements including recently deleted ones
        collaboration.broadcastScene(elementsIncludingDeleted.map(el => ({ 
          ...el, 
          version: el.version || 1 
        })), true);
      }
    };
    
    window.addEventListener('broadcastFullScene', handleBroadcastFullScene);
    return () => window.removeEventListener('broadcastFullScene', handleBroadcastFullScene);
  }, [isCollaborating, collaboration]);

  // 公式方式: シンプルなonChange処理
  const handleChange = useCallback(
    (elements: any, appState: any, files: any) => {
      console.log('Scene changed:', { elements: elements.length, isCollaborating });
      
      // Track element deletions for proper sync
      if (excalidrawAPIRef.current) {
        recentlyDeletedTracker.current.trackElementDeletions(lastElementsRef.current, elements);
        lastElementsRef.current = elements;
        
        // Periodic cleanup of old deleted elements
        recentlyDeletedTracker.current.cleanup();
      }
      
      // 公式方式: コラボレーション同期（削除された要素も含む）
      if (isCollaborating && collaboration.isCollaborating && excalidrawAPIRef.current) {
        // Get elements including recently deleted ones for proper sync
        const elementsForSync = getSceneElementsIncludingDeleted(
          excalidrawAPIRef.current,
          recentlyDeletedTracker.current.getRecentlyDeletedElements()
        );
        console.log('Syncing elements including recently deleted:', {
          totalElements: elementsForSync.length,
          currentElements: elements.length,
          recentlyDeleted: elementsForSync.length - elements.length
        });
        collaboration.syncElements(elementsForSync.map(el => ({ 
          ...el, 
          version: el.version || 1 
        })));
      }
      
      // ローカルストレージへの保存
      if (!isCollaborating) {
        saveToLocalStorage({ elements, appState, files });
      }
    },
    [isCollaborating, collaboration]
  );

  // Excalidrawコンポーネントがマウントされたとき
  const handleExcalidrawMount = useCallback((api: any) => {
    setExcalidrawAPI(api);
    excalidrawAPIRef.current = api;
  }, []);

  // デバッグ用: グローバルにsocket関数とExcalidraw APIを公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).socket = socket;
      (window as any).socketConnected = socket.isConnected;
      (window as any).isCollaborating = isCollaborating;
      (window as any).excalidrawAPI = excalidrawAPIRef.current;
      (window as any).pendingUrlJoin = pendingUrlJoin;
      (window as any).currentRoomId = currentRoomId;
      (window as any).currentUsername = currentUsername;
      // Add collaboration state for debugging username sync issues
      (window as any).collaborationState = collabRef.current?.getState?.();
      // Add socket ID for debugging
      (window as any).socketId = socket?.getSocketId?.();
    }
  }, [socket, isCollaborating, excalidrawAPIRef.current, pendingUrlJoin, currentRoomId, currentUsername, collabRef.current]);

  // ポインター更新のハンドラ (Excalidraw style)
  const handlePointerUpdate = useCallback(
    (payload: {
      pointer: { x: number; y: number };
      button: 'up' | 'down';
      pointersMap: any;
    }) => {
      // Excalidraw style: only broadcast if we have less than 2 pointers and are collaborating
      if (payload.pointersMap && payload.pointersMap.size < 2 && 
          isCollaborating && collabRef.current && payload.pointer && excalidrawAPIRef.current) {
        
        // Get current selection state
        const appState = excalidrawAPIRef.current.getAppState();
        const selectedElementIds = appState.selectedElementIds 
          ? Object.keys(appState.selectedElementIds).filter(id => appState.selectedElementIds![id])
          : [];
        
        console.log('Broadcasting pointer update with selection:', {
          pointer: payload.pointer,
          selectedElementIds: selectedElementIds,
          selectionCount: selectedElementIds.length
        });
        collabRef.current.broadcastPointerUpdate(payload.pointer.x, payload.pointer.y, selectedElementIds);
      }
    },
    [isCollaborating]
  );

  // コラボレーション状態変更のハンドラ
  const handleCollaborationStateChange = useCallback(
    (collaborating: boolean, roomKey?: string, roomId?: string, username?: string) => {
      console.log('handleCollaborationStateChange called with:', {
        collaborating,
        roomKey: roomKey ? 'exists' : 'none',
        roomId,
        username
      });
      
      setIsCollaborating(collaborating);
      
      if (collaborating && roomKey) {
        // Start collaboration with the room key
        collaboration.startCollaboration(roomKey);
        // Set room and username for title
        setCurrentRoomId(roomId || null);
        setCurrentUsername(username || null);
        console.log('Set room and username:', { roomId, username });
        // Close dialog and reset states on successful connection
        setShowRoomDialog(false);
        setIsConnecting(false);
        setRoomDialogError(null);
      } else if (!collaborating) {
        // Stop collaboration
        collaboration.stopCollaboration();
        setCollaboratorPointers(new Map());
        setCurrentRoomId(null);
        setCurrentUsername(null);
        setIsConnecting(false);
      }
    },
    [collaboration]
  );

  // コラボレーター変更のハンドラ
  const handleCollaboratorsChange = useCallback((newCollaborators: RoomUser[]) => {
    setCollaborators(newCollaborators);
  }, []);


  // ルームダイアログを閉じる
  const handleCloseRoomDialog = useCallback(() => {
    setShowRoomDialog(false);
    setRoomDialogError(null);
    setIsConnecting(false);
  }, []);

  // ShareDialogを開く
  const handleOpenShareDialog = useCallback(() => {
    setShowShareDialog(true);
    setRoomDialogError(null);
  }, []);

  // ShareDialogを閉じる
  const handleCloseShareDialog = useCallback(() => {
    setShowShareDialog(false);
    setRoomDialogError(null);
  }, []);

  // ユーザー名更新のハンドラ - Fix username synchronization
  const handleUpdateUsername = useCallback((newUsername: string) => {
    // Update App component state first to ensure immediate UI sync
    setCurrentUsername(newUsername);
    
    // Update collaboration component
    if (collabRef.current) {
      collabRef.current.updateUsername(newUsername);
    }
    
    console.log('App: Username updated to:', newUsername);
  }, []);

  // ルーム参加処理
  const handleJoinRoom = useCallback((data: { roomId: string; username: string }) => {
    if (collabRef.current) {
      setIsConnecting(true);
      setRoomDialogError(null);
      try {
        collabRef.current.joinRoom(data);
      } catch (error) {
        setRoomDialogError(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsConnecting(false);
        return;
      }
    }
    // Close both dialogs after join attempt
    setShowRoomDialog(false);
    setShowShareDialog(false);
    setIsConnecting(false);
  }, []);

  // ルーム退出処理
  const handleLeaveRoom = useCallback(() => {
    if (collabRef.current) {
      collabRef.current.leaveRoom();
    }
    // Close ShareDialog after leaving room
    setShowShareDialog(false);
  }, []);

  // ユーザー名変更処理 - Fix username synchronization
  const handleUsernameChange = useCallback((newUsername: string) => {
    // Update App component state first to ensure immediate UI sync
    setCurrentUsername(newUsername);
    saveUsername(newUsername); // Save to localStorage
    
    // Update collaboration component
    if (collabRef.current) {
      collabRef.current.updateUsername(newUsername);
    }
    
    console.log('App: Username changed to:', newUsername);
  }, []);

  return (
    <div className="app">
      {/* Hidden Collab component for backend functionality */}
      <div style={{ display: 'none' }}>
        <Collab
          ref={collabRef}
          onCollaborationStateChange={handleCollaborationStateChange}
          onCollaboratorsChange={handleCollaboratorsChange}
          onSceneUpdate={handleCollabSceneUpdate}
          onPointerUpdate={handleCollabPointerUpdate}
        />
      </div>
      
      <div className="excalidraw-wrapper" data-testid="excalidraw-canvas">
        <Excalidraw
          initialData={initialData as any}
          onChange={handleChange}
          excalidrawAPI={handleExcalidrawMount}
          onPointerUpdate={handlePointerUpdate}
          langCode="ja"
          theme="light"
          name="Excalidraw Board"
          UIOptions={{
            canvasActions: {
              loadScene: true,
              saveToActiveFile: true,
              export: {
                saveFileToDisk: true,
              },
              toggleTheme: true,
            },
          }}
          renderTopRightUI={() => {
            // Count active collaborators (excluding current user)
            const collaboratorCount = collaborators.filter(c => c.id !== currentUsername).length;
            
            return (
              <LiveCollaborationTrigger
                isCollaborating={isCollaborating}
                onSelect={handleOpenShareDialog}
                data-testid="live-collaboration-trigger"
              >
                {isCollaborating && collaboratorCount > 0 && (
                  <span className="collaborator-count">
                    {collaboratorCount}
                  </span>
                )}
              </LiveCollaborationTrigger>
            );
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveToActiveFile />
            <MainMenu.DefaultItems.Export />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            
            {/* Mobile collaboration menu - only rendered on mobile devices */}
            <CollabMobileMenu
              isConnected={socket.isConnected}
              isInRoom={isCollaborating}
              roomId={currentRoomId}
              collaborators={collaborators}
              currentUserId={currentUsername || ''}
              onUsernameChange={handleUsernameChange}
            />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Hints.HelpHint />
          </WelcomeScreen>
          
          {/* Desktop collaboration footer - only show when sharing */}
          {isCollaborating && (
            <CollabFooter
              roomId={currentRoomId}
              currentUserId={currentUsername || ''}
              onUsernameChange={handleUsernameChange}
            />
          )}
        </Excalidraw>
      </div>
      
      {/* Room dialog */}
      {showRoomDialog && (
        <RoomDialog
          isOpen={showRoomDialog}
          isConnecting={isConnecting}
          error={roomDialogError}
          onJoin={handleJoinRoom}
          onClose={handleCloseRoomDialog}
          initialRoomId={currentRoomId}
          initialUsername={currentUsername}
        />
      )}
      
      {/* Enhanced Share dialog */}
      {showShareDialog && (
        <ShareDialog
          isOpen={showShareDialog}
          isConnecting={isConnecting}
          error={roomDialogError}
          onJoin={handleJoinRoom}
          onClose={handleCloseShareDialog}
          onLeave={handleLeaveRoom}
          onUpdateUsername={handleUpdateUsername}
          isCollaborating={isCollaborating}
          currentRoomId={currentRoomId}
          currentUsername={currentUsername}
          collaborators={collaborators}
        />
      )}
    </div>
  );
}

export default App;
