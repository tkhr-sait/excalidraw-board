# Task 02: 基本的なExcalidrawコンポーネントの実装

## 概要
@excalidraw/excalidrawを使用して、基本的な描画機能を持つコンポーネントを実装する。

## 前提条件
- Task 01（開発環境構築）が完了していること
- フロントエンド開発環境が正常に動作すること

## 作業内容

### 1. テストコードの作成
```typescript
// frontend/src/components/__tests__/ExcalidrawBoard.test.tsx
import { render, screen } from '@testing-library/react';
import { ExcalidrawBoard } from '../ExcalidrawBoard';

describe('ExcalidrawBoard', () => {
  it('should render excalidraw component', () => {
    render(<ExcalidrawBoard />);
    expect(screen.getByTestId('excalidraw-board')).toBeInTheDocument();
  });

  it('should initialize with collaboration disabled', () => {
    render(<ExcalidrawBoard />);
    // コラボレーションボタンが非表示であることを確認
    expect(screen.queryByLabelText('collaboration')).not.toBeInTheDocument();
  });
});
```

### 2. Excalidrawコンポーネントの実装
```typescript
// frontend/src/components/ExcalidrawBoard.tsx
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useState } from 'react';

export const ExcalidrawBoard: React.FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  return (
    <div 
      data-testid="excalidraw-board"
      style={{ height: '100vh', width: '100vw' }}
    >
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        theme="light"
        name="excalidraw-board"
      />
    </div>
  );
};
```

### 3. App.tsxの更新
```typescript
// frontend/src/App.tsx
import { ExcalidrawBoard } from './components/ExcalidrawBoard';
import './App.css';

function App() {
  return <ExcalidrawBoard />;
}

export default App;
```

### 4. スタイルの調整
```css
/* frontend/src/App.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
}

#root {
  height: 100vh;
  width: 100vw;
}
```

### 5. 型定義の追加
```typescript
// frontend/src/types/excalidraw.d.ts
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

export interface ExcalidrawBoardProps {
  onReady?: (api: ExcalidrawImperativeAPI) => void;
}
```

## 検証項目
- [x] `npm test` でテストが通ること
- [x] `npm run dev` で起動し、Excalidrawが表示されること
- [x] 描画ツールが正常に動作すること
- [x] 図形の作成、選択、移動、削除ができること
- [x] TypeScriptの型エラーがないこと

## 成果物
- frontend/src/components/ExcalidrawBoard.tsx
- frontend/src/components/__tests__/ExcalidrawBoard.test.tsx
- frontend/src/types/excalidraw.d.ts
- 更新されたfrontend/src/App.tsx
- 更新されたfrontend/src/App.css

## 次のステップ
Task 03: WebSocket接続の実装