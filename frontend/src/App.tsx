import { useCallback, useEffect, useState, useRef } from 'react';
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
} from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  AppState,
  ExcalidrawImperativeAPI,
} from './types/excalidraw';
import type { RoomUser, SceneUpdate, CollaboratorPointer } from './types/socket';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/storage';
import { Collab } from './components/collab/Collab';
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

  // リモートシーンデータの受信（従来のSocket.IO方式）
  useEffect(() => {
    const handleSceneData = (data: SceneUpdate) => {
      const excalidrawAPI = excalidrawAPIRef.current;
      if (excalidrawAPI) {
        console.log('Received scene data via socket.io:', data);
        // Store received data for testing
        if (typeof window !== 'undefined') {
          (window as any).lastReceivedSceneData = data;
        }
        // Set flag to prevent feedback loop
        isRemoteUpdateRef.current = true;
        // Ensure collaborators is a Map object, not an array
        const appState = {
          ...data.appState,
          collaborators: data.appState?.collaborators instanceof Map 
            ? data.appState.collaborators 
            : new Map()
        };
        excalidrawAPI.updateScene({
          elements: data.elements,
          appState: appState,
        });
      }
    };

    const handleCollaboratorPointer = (data: CollaboratorPointer) => {
      console.log('Received pointer update via socket.io:', data);
      setCollaboratorPointers(prev => {
        const updated = new Map(prev);
        updated.set(data.userId, data);
        return updated;
      });
    };

    socket.on('scene-data', handleSceneData);
    socket.on('collaborator-pointer', handleCollaboratorPointer);

    return () => {
      socket.off('scene-data');
      socket.off('collaborator-pointer');
    };
  }, [socket]);

  // Collab コンポーネントからの同期データ受信
  const handleCollabSceneUpdate = useCallback((data: { elements: any[]; appState: any }) => {
    const excalidrawAPI = excalidrawAPIRef.current;
    if (excalidrawAPI) {
      console.log('Received scene update from Collab:', data.elements.length, 'elements');
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
        elements: data.elements,
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
      
      // ローカルストレージへの保存
      if (!isCollaborating) {
        saveToLocalStorage({ elements, appState, files });
      }
      
      // コラボレーション中はブロードキャスト（シンプルなSocket.IO方式）
      if (isCollaborating && socket.isConnected) {
        console.log('Broadcasting scene update via Socket.IO...');
        socket.emit('scene-update', {
          elements: elements,
          appState: appState
        });
      }
    },
    [isCollaborating, socket]
  );

  // Excalidrawコンポーネントがマウントされたとき
  const handleExcalidrawMount = useCallback((api: any) => {
    setExcalidrawAPI(api);
    excalidrawAPIRef.current = api;
  }, []);

  // デバッグ用: グローバルにsocket関数を公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).socket = socket;
      (window as any).socketConnected = socket.isConnected;
      (window as any).isCollaborating = isCollaborating;
    }
  }, [socket, isCollaborating]);

  // ポインター更新のハンドラ
  const handlePointerUpdate = useCallback(
    (payload: any) => {
      if (isCollaborating && collaboration.isCollaborating && payload.pointer) {
        collaboration.broadcastMouseLocation(payload.pointer);
      }
    },
    [isCollaborating, collaboration]
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
