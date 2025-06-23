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
import type { RoomUser, SceneUpdate, CollaboratorPointer } from './types/socket';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/storage';
import { Collab } from './components/collab/Collab';
import type { CollabHandle } from './components/collab/Collab';
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
  const [, setCollaborators] = useState<RoomUser[]>([]);
  const [, setCollaboratorPointers] = useState<
    Map<string, CollaboratorPointer>
  >(new Map());

  // Excalidraw APIの参照を保持
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // Collab componentの参照を保持
  const collabRef = useRef<CollabHandle | null>(null);

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
    }
  }, [socket, isCollaborating, excalidrawAPIRef.current]);

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
      } else if (!collaborating) {
        // Stop collaboration
        collaboration.stopCollaboration();
        setCollaboratorPointers(new Map());
        setCurrentRoomId(null);
        setCurrentUsername(null);
      }
    },
    [collaboration]
  );

  // コラボレーター変更のハンドラ
  const handleCollaboratorsChange = useCallback((newCollaborators: RoomUser[]) => {
    setCollaborators(newCollaborators);
  }, []);

  return (
    <div className="app">
      <Collab
        ref={collabRef}
        onCollaborationStateChange={handleCollaborationStateChange}
        onCollaboratorsChange={handleCollaboratorsChange}
        onSceneUpdate={handleCollabSceneUpdate}
        onPointerUpdate={handleCollabPointerUpdate}
      />
      
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
          renderTopRightUI={() => (
            <LiveCollaborationTrigger
              isCollaborating={isCollaborating}
              onSelect={() => {
                if (!isCollaborating) {
                  const joinButton = document.querySelector('[data-testid="collab-join-room-button"]') as HTMLButtonElement;
                  if (joinButton) {
                    joinButton.click();
                  }
                } else {
                  const leaveButton = document.querySelector('[data-testid="collab-leave-room-button"]') as HTMLButtonElement;
                  if (leaveButton) {
                    leaveButton.click();
                  }
                }
              }}
            />
          )}
        >
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveToActiveFile />
            <MainMenu.DefaultItems.Export />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Hints.HelpHint />
          </WelcomeScreen>
        </Excalidraw>
      </div>
    </div>
  );
}

export default App;
