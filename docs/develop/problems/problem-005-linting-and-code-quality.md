# Problem 005: Linting and Code Quality

## 問題概要

ESLintやTypeScriptの型チェックで多数の警告・エラーが残っており、コード品質とメンテナビリティに課題がある。

## 影響範囲

- 全体的なコード品質
- 開発者体験
- 将来的なメンテナンス性
- CI/CDパイプライン

## 具体的な問題

### 1. ESLint警告・エラー (48問題: 13エラー、35警告)

#### React Hooks関連
```typescript
// error: React Hook "useCollaboration" is called conditionally
// src/components/Board/CollaborativeBoard.tsx:26:7
const CollaborativeBoard: React.FC = () => {
  const { roomId } = useParams();
  
  if (!roomId) {
    return <div>Error</div>; // ここで早期リターン
  }

  const collaboration = useCollaboration(roomId); // フック呼び出しが条件付き
};
```

#### TypeScript型安全性
```typescript
// warning: Unexpected any. Specify a different type
// 複数ファイルで any 型の使用（35箇所）

// src/hooks/useCollaboration.ts
const handleChange = (newElements: readonly any[], newAppState: any) => {
  // any型が多用されている
};
```

#### 未使用変数
```typescript
// error: 'boardPage' is assigned a value but never used
// tests/e2e/basic.spec.ts:113:11
const boardPage = new BoardPage(page); // 使用されていない
```

#### React Hooks依存配列
```typescript
// warning: React Hook useEffect has missing dependencies
// src/hooks/useCollaboration.ts:105:6
useEffect(() => {
  // 依存配列が不完全
}, [roomId]); // onConnect, onDisconnect等が不足
```

### 2. TypeScript型チェック
- 現状：警告は出ていないが、`any`型の多用により型安全性が不十分
- 問題：実行時エラーのリスクが高い

## 現在のlint結果詳細

### エラー箇所 (13件)
1. **React Hook条件付き呼び出し** (1件)
   - `src/components/Board/CollaborativeBoard.tsx:26:7`

2. **未使用変数** (6件)
   - `tests/e2e/basic.spec.ts:113:11`
   - `tests/e2e/global-setup.ts:3:28`
   - `tests/e2e/global-teardown.ts:3:31`
   - `tests/e2e/specs/error-handling.spec.ts:332:27`
   - `tests/e2e/specs/performance.spec.ts:234:13,235:13`
   - `tests/integration/collaboration.test.ts:6:43`

3. **CommonJS require使用** (2件)
   - `tests/integration/collaboration.test.ts:22:34,28:34`

4. **その他** (4件)

### 警告箇所 (35件)
1. **any型使用** (30+件)
   - WebSocket関連: `src/services/websocket.ts`
   - Collaboration関連: `src/hooks/useCollaboration.ts`
   - 状態管理: `src/stores/atoms/boardAtoms.ts`
   - テストコード: 複数ファイル

2. **依存配列不足** (1件)
   - `src/hooks/useCollaboration.ts:105:6`

## 根本原因分析

### 1. 型定義の不備
```typescript
// 現状：any型の多用
interface WebSocketCallbacks {
  onSceneUpdate?: (elements: any[], appState: any) => void; // any使用
}

// 改善案：適切な型定義
interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  // ...
}

interface WebSocketCallbacks {
  onSceneUpdate?: (elements: ExcalidrawElement[], appState: ExcalidrawAppState) => void;
}
```

### 2. React Hooks使用パターンの問題
```typescript
// 問題のあるパターン
const Component = () => {
  const { param } = useParams();
  
  if (!param) return <Error />; // 早期リターン
  
  const hook = useCustomHook(param); // フック呼び出しが条件付き
};
```

### 3. テストコードの品質
```typescript
// 問題：CommonJS記法の混在
const { useCollaboration } = require('../../src/hooks/useCollaboration'); // CommonJS
import { describe, it } from 'vitest'; // ES Modules

// 未使用変数の放置
const boardPage = new BoardPage(page); // 使用されない
```

## 提案される解決策

### 短期対応（即座に修正可能）

1. **未使用変数の削除・修正**
   ```typescript
   // tests/e2e/global-setup.ts
   async function globalSetup(_config: FullConfig) { // _ プレフィックス追加
   
   // 未使用変数の削除
   // const boardPage = new BoardPage(page); // この行を削除
   ```

2. **CommonJS→ES Modules変換**
   ```typescript
   // 変更前
   const { useCollaboration } = require('../../src/hooks/useCollaboration');
   
   // 変更後  
   import { useCollaboration } from '../../src/hooks/useCollaboration';
   ```

3. **React Hook呼び出しパターン修正**
   ```typescript
   // 変更前（条件付きフック呼び出し）
   const Component = () => {
     const { roomId } = useParams();
     if (!roomId) return <Error />;
     const collaboration = useCollaboration(roomId);
   };
   
   // 変更後（フック呼び出しを上位に）
   const Component = () => {
     const { roomId } = useParams();
     const collaboration = useCollaboration(roomId || '');
     
     if (!roomId) return <Error />;
     // 以下正常処理
   };
   ```

### 中期対応（型安全性向上）

1. **Excalidraw型定義の整備**
   ```typescript
   // src/types/excalidraw.ts
   export interface ExcalidrawElement {
     id: string;
     type: 'rectangle' | 'ellipse' | 'arrow' | 'text';
     x: number;
     y: number;
     width: number;
     height: number;
     // ...
   }
   
   export interface ExcalidrawAppState {
     viewBackgroundColor: string;
     zoom: number;
     // ...
   }
   ```

2. **WebSocket型定義の改善**
   ```typescript
   // src/services/websocket.ts
   export interface WebSocketCallbacks {
     onConnect?: () => void;
     onDisconnect?: (reason: string) => void;
     onSceneUpdate?: (elements: ExcalidrawElement[], appState: ExcalidrawAppState) => void;
     // any型を排除
   }
   ```

3. **依存配列の修正**
   ```typescript
   // useEffect依存配列の適切な管理
   useEffect(() => {
     // 処理
   }, [roomId, setConnectionStatus, setConnectedUsers]); // 必要な依存関係を追加
   ```

### 長期対応（開発プロセス改善）

1. **pre-commit hooks設定**
   ```json
   // package.json
   {
     "husky": {
       "hooks": {
         "pre-commit": "lint-staged"
       }
     },
     "lint-staged": {
       "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
     }
   }
   ```

2. **より厳格なESLint設定**
   ```javascript
   // .eslintrc.cjs
   module.exports = {
     rules: {
       '@typescript-eslint/no-explicit-any': 'error', // 警告→エラーに
       '@typescript-eslint/no-unused-vars': 'error',
       'react-hooks/exhaustive-deps': 'error'
     }
   };
   ```

3. **TypeScript strict モード**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true
     }
   }
   ```

## 修正優先度

### 高優先度（即座に修正）
1. ✅ React Hook条件付き呼び出し（既に修正済み）
2. [ ] 未使用変数の削除
3. [ ] CommonJS→ES Modules変換

### 中優先度（段階的に改善）
1. [ ] any型の置き換え（主要箇所から）
2. [ ] 依存配列の修正
3. [ ] テストコードの品質向上

### 低優先度（継続的改善）
1. [ ] 全any型の排除
2. [ ] strict TypeScriptモード
3. [ ] 詳細な型定義追加

## 影響度

- **重要度**: 中〜高（コード品質とメンテナンス性）
- **緊急度**: 中
- **開発効率への影響**: 中（型安全性向上により長期的には改善）

## 次のアクション

1. [ ] 未使用変数の一括削除
2. [ ] CommonJS記法の修正
3. [ ] 主要な any型の置き換え開始
4. [ ] 依存配列の段階的修正
5. [ ] pre-commit hooks導入検討

## 関連ファイル

- `.eslintrc.cjs`
- `tsconfig.json`
- `src/types/` (型定義ディレクトリ)
- `src/hooks/useCollaboration.ts`
- `src/services/websocket.ts`
- `tests/` (全テストファイル)

## 更新履歴

- 2025-06-22: 初回作成