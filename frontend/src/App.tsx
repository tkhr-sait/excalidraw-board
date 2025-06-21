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
import { SyncService } from './services/sync';
import { useSocket } from './hooks/useSocket';
import './App.css';

function App() {
  const socket = useSocket();
  const [, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
  } | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [, setCollaborators] = useState<RoomUser[]>([]);
  const [syncService, setSyncService] = useState<SyncService | null>(null);
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

  // SyncServiceの初期化
  useEffect(() => {
    if (socket.isConnected && isCollaborating) {
      const emitFunc = (event: string, data: any) => socket.emit(event as any, data);
      const service = new SyncService(emitFunc);
      setSyncService(service);
      
      return () => {
        service.cleanup();
      };
    } else {
      setSyncService(null);
    }
  }, [socket.isConnected, socket.emit, isCollaborating]);

  // リモートシーンデータの受信
  useEffect(() => {
    const handleSceneData = (data: SceneUpdate) => {
      const excalidrawAPI = excalidrawAPIRef.current;
      if (excalidrawAPI && syncService) {
        const currentElements = excalidrawAPI.getSceneElements();
        const reconciledElements = syncService.reconcileElements(
          currentElements,
          data.elements
        );
        
        excalidrawAPI.updateScene({
          elements: reconciledElements,
          appState: data.appState,
        });
      }
    };

    const handleCollaboratorPointer = (data: CollaboratorPointer) => {
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
  }, [socket, syncService]);

  // シーン変更のハンドラ
  const handleChange = useCallback(
    (elements: any, appState: any, files: any) => {
      // ローカルストレージへの保存
      if (!isCollaborating) {
        saveToLocalStorage({ elements, appState, files });
      }
      
      // コラボレーション中はブロードキャスト
      if (isCollaborating && syncService) {
        syncService.broadcastSceneChange(elements, appState);
      }
    },
    [isCollaborating, syncService]
  );

  // Excalidrawコンポーネントがマウントされたとき
  const handleExcalidrawMount = useCallback((api: any) => {
    setExcalidrawAPI(api);
    excalidrawAPIRef.current = api;
  }, []);

  // ポインター更新のハンドラ
  const handlePointerUpdate = useCallback(
    (payload: any) => {
      if (isCollaborating && syncService && payload.pointer) {
        syncService.broadcastPointerUpdate({
          x: payload.pointer.x,
          y: payload.pointer.y
        });
      }
    },
    [isCollaborating, syncService]
  );

  // コラボレーション状態変更のハンドラ
  const handleCollaborationStateChange = useCallback(
    (collaborating: boolean) => {
      setIsCollaborating(collaborating);
      
      if (!collaborating) {
        setCollaboratorPointers(new Map());
      }
    },
    []
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
