import { useCallback, useEffect, useState, useRef } from 'react';
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
} from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from './types/excalidraw';
import type { RoomUser } from './types/socket';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/storage';
import { Collab } from './components/collab/Collab';
import './App.css';

function App() {
  const [, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
  } | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [, setCollaborators] = useState<RoomUser[]>([]);

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

  // シーン変更のハンドラ
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // コラボレーションモードでない場合のみローカルに保存
      if (!isCollaborating) {
        saveToLocalStorage({ elements, appState, files });
      }
    },
    [isCollaborating]
  );

  // Excalidrawコンポーネントがマウントされたとき
  const handleExcalidrawMount = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
    excalidrawAPIRef.current = api;
  }, []);

  // コラボレーション状態変更のハンドラ
  const handleCollaborationStateChange = useCallback((collaborating: boolean) => {
    setIsCollaborating(collaborating);
  }, []);

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
          initialData={initialData || undefined}
          onChange={handleChange}
          excalidrawAPI={handleExcalidrawMount}
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
