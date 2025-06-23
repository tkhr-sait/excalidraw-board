import { useCallback, useEffect, useState, useRef } from 'react';
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  LiveCollaborationTrigger,
} from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  AppState,
  ExcalidrawImperativeAPI,
} from './types/excalidraw';
import type { RoomUser, CollaboratorPointer } from './types/socket';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/storage';
import { Collab } from './components/collab/Collab';
import type { CollabHandle } from './components/collab/Collab';
import { CollabFooter } from './components/collab/CollabFooter';
import { CollabMobileMenu } from './components/collab/CollabMobileMenu';
import { RoomDialog } from './components/collab/RoomDialog';
import { useCollaboration } from './hooks/useCollaboration';
import { useSocket } from './hooks/useSocket';
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
  const [roomDialogError, setRoomDialogError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingUrlJoin, setPendingUrlJoin] = useState<{roomId: string; username: string} | null>(null);

  // Excalidraw APIの参照を保持
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // Collab componentの参照を保持
  const collabRef = useRef<CollabHandle | null>(null);

  // URLパラメータからRoom情報を取得
  useEffect(() => {
    console.log('URL processing effect running...');
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    const usernameFromUrl = urlParams.get('username');
    
    console.log('URL params:', { roomIdFromUrl, usernameFromUrl, search: window.location.search });
    
    if (roomIdFromUrl && usernameFromUrl) {
      console.log('Setting up URL join for room:', roomIdFromUrl, 'username:', usernameFromUrl);
      // URL経由でRoom参加 - 自動的にルームに参加するためのペンディング状態を設定
      setCurrentRoomId(roomIdFromUrl);
      setCurrentUsername(usernameFromUrl);
      setPendingUrlJoin({ roomId: roomIdFromUrl, username: usernameFromUrl });
      
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
    
    if (pendingUrlJoin && collabRef.current) {
      if (socket.isConnected) {
        console.log('Auto-joining room from URL parameters:', pendingUrlJoin);
        setIsConnecting(true);
        setRoomDialogError(null);
        try {
          collabRef.current.joinRoom({
            roomId: pendingUrlJoin.roomId,
            username: pendingUrlJoin.username
          });
          console.log('joinRoom called successfully for URL login');
          setPendingUrlJoin(null); // ペンディング状態をクリア
        } catch (error) {
          console.error('Error joining room from URL:', error);
          setRoomDialogError(error instanceof Error ? error.message : 'Unknown error occurred');
          setIsConnecting(false);
          setShowRoomDialog(true); // エラー時はダイアログを表示
          setPendingUrlJoin(null);
        }
      } else {
        console.log('Socket not connected yet, waiting for connection...');
      }
    }
  }, [pendingUrlJoin, socket.isConnected]);

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

  // Collab コンポーネントからの同期データ受信
  const handleCollabSceneUpdate = useCallback((data: { elements: any[]; appState: any }) => {
    const excalidrawAPI = excalidrawAPIRef.current;
    if (excalidrawAPI) {
      console.log('Received scene update from Collab:', data.elements.length, 'elements');
      
      // Debug: Log element dimensions before applying update
      const elementDebug = data.elements.map(el => ({
        id: el.id?.substring(0, 8) + '...' || 'unknown',
        type: el.type || 'unknown',
        width: el.width || 0,
        height: el.height || 0,
        x: el.x || 0,
        y: el.y || 0,
        isDeleted: el.isDeleted || false
      }));
      console.log('App received elements:', elementDebug);
      
      // Validate element integrity before applying
      const validElements = data.elements.filter(el => {
        if (!el || el.isDeleted) return false;
        
        // Check for minimum valid dimensions
        if (el.width !== undefined && el.width < 0.1) {
          console.warn(`Element ${el.id} has invalid width: ${el.width}`);
          return false;
        }
        if (el.height !== undefined && el.height < 0.1) {
          console.warn(`Element ${el.id} has invalid height: ${el.height}`);
          return false;
        }
        
        return true;
      });
      
      if (validElements.length !== data.elements.length) {
        console.warn(`Filtered out ${data.elements.length - validElements.length} invalid elements`);
      }
      
      // Get current elements to merge with received elements
      const currentElements = excalidrawAPI.getSceneElements();
      
      // Merge strategy: keep local elements that aren't in the received update
      const elementMap = new Map();
      
      // Add current elements first
      currentElements.forEach((el: any) => {
        if (el && !el.isDeleted) {
          elementMap.set(el.id, el);
        }
      });
      
      // Override with received elements
      validElements.forEach((el: any) => {
        if (el && !el.isDeleted) {
          elementMap.set(el.id, el);
        }
      });
      
      const mergedElements = Array.from(elementMap.values());
      
      console.log(`Merging elements: ${currentElements.length} current + ${validElements.length} received = ${mergedElements.length} total`);
      
      // Set flag to prevent feedback loop
      isRemoteUpdateRef.current = true;
      // Ensure collaborators is a Map object
      const appState = {
        ...data.appState,
        collaborators: data.appState?.collaborators instanceof Map 
          ? data.appState.collaborators 
          : new Map()
      };
      excalidrawAPI.updateScene({
        elements: mergedElements,
        appState: appState,
      });
    }
  }, []);

  const handleCollabPointerUpdate = useCallback((data: { userId: string; x: number; y: number }) => {
    console.log('Received pointer update from Collab:', data);
    setCollaboratorPointers(prev => {
      const updated = new Map(prev);
      updated.set(data.userId, data);
      return updated;
    });
  }, []);

  // フラグ: リモートアップデートからの変更かどうか
  const isRemoteUpdateRef = useRef(false);

  // シーン変更のハンドラ
  const handleChange = useCallback(
    (elements: any, appState: any, files: any) => {
      // リモートアップデートからの変更の場合は、ブロードキャストしない
      if (isRemoteUpdateRef.current) {
        console.log('Scene changed from remote update, skipping broadcast');
        isRemoteUpdateRef.current = false;
        return;
      }
      
      console.log('Scene changed:', { elements: elements.length, isCollaborating });
      
      // Debug: Log local element dimensions before broadcasting
      if (isCollaborating && elements.length > 0) {
        const localElementDebug = elements.map((el: any) => ({
          id: el.id?.substring(0, 8) + '...' || 'unknown',
          type: el.type || 'unknown',
          width: el.width || 0,
          height: el.height || 0,
          x: el.x || 0,
          y: el.y || 0,
          isDeleted: el.isDeleted || false
        }));
        console.log('Local scene changed, elements:', localElementDebug);
      }
      
      // ローカルストレージへの保存
      if (!isCollaborating) {
        saveToLocalStorage({ elements, appState, files });
      }
      
      // コラボレーション中はCollabコンポーネント経由でブロードキャスト
      if (isCollaborating && collabRef.current) {
        console.log('Broadcasting scene update via encrypted channel...');
        collabRef.current.broadcastSceneUpdate(elements, appState);
      }
    },
    [isCollaborating, socket]
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
    }
  }, [socket, isCollaborating, excalidrawAPIRef.current, pendingUrlJoin, currentRoomId, currentUsername]);

  // ポインター更新のハンドラ
  const handlePointerUpdate = useCallback(
    (payload: any) => {
      if (isCollaborating && collabRef.current && payload.pointer) {
        console.log('Broadcasting pointer update:', payload.pointer);
        collabRef.current.broadcastPointerUpdate(payload.pointer.x, payload.pointer.y);
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

  // ルームダイアログを開く
  const handleOpenRoomDialog = useCallback(() => {
    setShowRoomDialog(true);
  }, []);

  // ルームダイアログを閉じる
  const handleCloseRoomDialog = useCallback(() => {
    setShowRoomDialog(false);
    setRoomDialogError(null);
    setIsConnecting(false);
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
    setShowRoomDialog(false);
    setIsConnecting(false);
  }, []);

  // ルーム退出処理
  const handleLeaveRoom = useCallback(() => {
    if (collabRef.current) {
      collabRef.current.leaveRoom();
    }
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
                onSelect={() => {
                  if (!isCollaborating) {
                    handleOpenRoomDialog();
                  } else {
                    handleLeaveRoom();
                  }
                }}
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
            />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Hints.HelpHint />
          </WelcomeScreen>
          
          {/* Desktop collaboration footer */}
          <CollabFooter
            isConnected={socket.isConnected}
            isInRoom={isCollaborating}
            roomId={currentRoomId}
            collaborators={collaborators}
            currentUserId={currentUsername || ''}
          />
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
    </div>
  );
}

export default App;
