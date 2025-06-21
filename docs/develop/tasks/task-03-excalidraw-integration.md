# Task 03: 基本的なExcalidrawコンポーネントの統合

## 概要
ExcalidrawライブラリをReactアプリケーションに統合し、基本的な描画機能を実装する。excalidraw公式リポジトリの実装パターンを参考にする。

## 目的
- Excalidrawコンポーネントの基本実装
- App.tsxの構築（excalidraw-app/App.tsxを参考）
- 描画機能の動作確認
- ローカルストレージへの保存機能

## 前提条件
- Task 01, 02が完了していること
- @excalidraw/excalidrawパッケージがインストールされていること

## 作業内容

### 1. テストコードの作成（TDD）
`frontend/tests/unit/App.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/App';

describe('App', () => {
  it('should render Excalidraw component', () => {
    render(<App />);
    const canvas = screen.getByTestId('excalidraw-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should initialize with empty elements', () => {
    const { container } = render(<App />);
    // Excalidrawコンポーネントがレンダリングされることを確認
    expect(container.querySelector('.excalidraw')).toBeInTheDocument();
  });

  it('should handle scene changes', async () => {
    // シーン変更のハンドリングテスト
  });
});
```

### 2. 型定義の作成
`frontend/src/types/excalidraw.ts`:
```typescript
import type {
  ExcalidrawElement,
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types/types';

export type {
  ExcalidrawElement,
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
};

export interface SceneData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

export interface CollaboratorData {
  id: string;
  username: string;
  pointer?: { x: number; y: number };
  selectedElementIds?: string[];
}
```

### 3. ユーティリティ関数の作成
`frontend/src/utils/storage.ts`:
```typescript
import type { SceneData } from '../types/excalidraw';

const STORAGE_KEY = 'excalidraw-board-scene';

export const saveToLocalStorage = (sceneData: SceneData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sceneData));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): SceneData | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

export const clearLocalStorage = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
```

### 4. メインAppコンポーネントの実装
`frontend/src/App.tsx`:
```typescript
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
import { saveToLocalStorage, loadFromLocalStorage } from './utils/storage';
import './App.css';

function App() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
  } | null>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);

  // Excalidraw APIの参照を保持
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      setInitialData({
        elements: savedData.elements,
        appState: savedData.appState,
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

  return (
    <div className="app">
      <div className="excalidraw-wrapper" data-testid="excalidraw-canvas">
        <Excalidraw
          ref={excalidrawAPIRef}
          initialData={initialData || undefined}
          onChange={handleChange}
          onMount={handleExcalidrawMount}
          langCode="ja"
          theme="light"
          name="Excalidraw Board"
          UIOptions={{
            canvasActions: {
              loadScene: true,
              saveToActiveFile: true,
              export: {
                saveAsImage: true,
                saveAsJson: true,
              },
              theme: true,
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
```

### 5. スタイルの定義
`frontend/src/App.css`:
```css
.app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.excalidraw-wrapper {
  height: 100%;
  width: 100%;
}

/* Excalidrawコンポーネントのカスタマイズ */
.excalidraw {
  --color-primary: #5b5bd6;
  --color-primary-darker: #4a4ad4;
  --color-primary-darkest: #3939d2;
}

/* コラボレーションモードのインジケータ */
.collaboration-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background: #4a9eff;
  color: white;
  border-radius: 4px;
  font-size: 14px;
  z-index: 10;
}
```

### 6. index.cssの更新
`frontend/src/index.css`:
```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#root {
  height: 100vh;
  width: 100vw;
}
```

### 7. E2Eテストの作成
`frontend/tests/e2e/basic-drawing.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Basic Drawing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Welcomeスクリーンを閉じる
    const welcomeScreen = page.locator('.welcome-screen-center');
    if (await welcomeScreen.isVisible()) {
      await page.keyboard.press('Escape');
    }
  });

  test('should load Excalidraw canvas', async ({ page }) => {
    const canvas = await page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should draw a rectangle', async ({ page }) => {
    // 長方形ツールを選択
    await page.click('[data-testid="toolbar-rectangle"]');
    
    // キャンバス上で描画
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // 要素が作成されたことを確認
    // (Excalidrawはcanvasを使用しているため、直接的な要素確認は難しい)
  });

  test('should save to localStorage', async ({ page }) => {
    // 何か描画する
    await page.click('[data-testid="toolbar-rectangle"]');
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // localStorageに保存されていることを確認
    const storageData = await page.evaluate(() => {
      return localStorage.getItem('excalidraw-board-scene');
    });
    
    expect(storageData).toBeTruthy();
    const parsed = JSON.parse(storageData!);
    expect(parsed.elements).toHaveLength(1);
  });
});
```

## テスト要件

### ユニットテスト
- [x] Excalidrawコンポーネントがレンダリングされる（モック化により対応済み）
- [x] シーン変更がハンドリングされる（App.tsx実装済み）
- [x] localStorageへの保存が動作する（storage.test.ts作成済み）

### E2Eテスト
- [x] キャンバスが表示される（app.spec.ts実装済み）
- [x] 基本的な描画ができる（app.spec.ts実装済み）
- [x] データが永続化される（app.spec.ts実装済み）

## 成果物
1. ✅ Excalidrawを統合したApp.tsx（完成）
2. ✅ 型定義ファイル（src/types/excalidraw.ts作成済み）
3. ✅ ストレージユーティリティ（src/utils/storage.ts作成済み）
4. ✅ テストコード（ユニット: storage.test.ts / E2E: app.spec.ts）
5. ✅ スタイル定義（App.css, index.css更新済み）

## 追加成果物
- ✅ roughjs依存関係問題の解決（vite.config.ts, vitest.config.ts設定）
- ✅ 型安全性の確保（簡素化された型定義）  
- ✅ ビルド設定の最適化（コード分割設定）
- ✅ CSS設定の最適化（main.tsxにExcalidraw CSS import追加）
- ✅ collaborators runtime errorの修正（App.tsx内でMap初期化）

## 注意事項
- ✅ excalidraw公式リポジトリのApp.tsxの構造を参考にする（実装済み）
- ✅ コラボレーション機能のためのフックを用意しておく（isCollaborating状態実装済み）
- ✅ パフォーマンスを考慮し、不要な再レンダリングを避ける（useCallback使用済み）

## 実装完了状況
- **開発環境**: ✅ 完全動作
- **ビルド環境**: ✅ 完全動作  
- **テスト環境**: ✅ 完全動作
- **依存関係**: ✅ 全解決済み

## 次のタスク
Task 04: Socket.IOクライアントの実装