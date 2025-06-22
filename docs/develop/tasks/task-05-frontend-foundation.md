# タスク05: フロントエンド基盤構築

## 目的

Reactプロジェクトを新規作成し、Excalidrawコンポーネントを統合したフロントエンドの基盤を構築する。

## 前提条件

- [ ] タスク03（開発環境構築）が完了していること
- [ ] タスク04（バックエンド接続検証）が完了していること
- [ ] WebSocketプロトコルが理解できていること

## 実装項目

### 1. Reactプロジェクトの初期設定

- [ ] Viteを使用したプロジェクト作成
- [ ] TypeScript設定
- [ ] 必要なパッケージのインストール
- [ ] ディレクトリ構造の整理

### 2. Excalidrawの統合

- [ ] @excalidraw/excalidrawパッケージのインストール
- [ ] 基本的なExcalidrawコンポーネントの実装
- [ ] スタイリングの調整
- [ ] 初期設定とオプション

### 3. 基本UIの実装

- [ ] レイアウトコンポーネント
- [ ] ヘッダー/フッター
- [ ] エラーバウンダリー
- [ ] ローディング表示

### 4. 状態管理の基盤

- [ ] 状態管理ライブラリの選定と設定
- [ ] グローバル状態の定義
- [ ] Excalidraw状態の管理
- [ ] 永続化の検討

## 成果物

- [ ] フロントエンドプロジェクト（frontend/）
- [ ] コンポーネント設計書（docs/adr/0009-component-design.md）
- [ ] スタイルガイド（docs/style-guide.md）
- [ ] 基本動作のデモ

## 実施手順

1. プロジェクトの作成
   ```bash
   cd frontend
   npm create vite@latest . -- --template react-ts
   npm install
   
   # Excalidrawと関連パッケージ
   npm install @excalidraw/excalidraw
   npm install socket.io-client
   ```

2. 基本構造の実装
   ```typescript
   // src/App.tsx
   import { Excalidraw } from "@excalidraw/excalidraw";
   import "./App.css";
   
   function App() {
     return (
       <div className="app">
         <header className="app-header">
           <h1>Excalidraw Board</h1>
         </header>
         <main className="app-main">
           <Excalidraw />
         </main>
       </div>
     );
   }
   ```

3. ディレクトリ構造
   ```
   frontend/
   ├── src/
   │   ├── components/
   │   │   ├── Board/
   │   │   ├── Header/
   │   │   └── common/
   │   ├── hooks/
   │   ├── services/
   │   ├── store/
   │   ├── types/
   │   ├── utils/
   │   ├── App.tsx
   │   └── main.tsx
   ├── public/
   └── tests/
   ```

4. 型定義の整備
   ```typescript
   // src/types/excalidraw.d.ts
   import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/types";
   
   export interface BoardState {
     elements: readonly ExcalidrawElement[];
     appState: any;
   }
   ```

## テスト実装

### ユニットテスト（テスト駆動開発）

実装前に以下のテストを作成：

```typescript
// tests/unit/components/Board.test.tsx
describe('Board Component', () => {
  it('should render Excalidraw component', () => {
    // テスト実装
  });
  
  it('should handle state changes', () => {
    // テスト実装
  });
});
```

### 統合テスト

```typescript
// tests/integration/app.test.tsx
describe('App Integration', () => {
  it('should load and display the board', () => {
    // テスト実装
  });
});
```

## 開発時の注意点

1. **パフォーマンス**
   - 不要な再レンダリングを避ける
   - メモ化の適切な使用
   - 大きなデータの扱い

2. **アクセシビリティ**
   - キーボード操作のサポート
   - スクリーンリーダー対応
   - 適切なARIA属性

3. **ブラウザ互換性**
   - 対象ブラウザの明確化
   - ポリフィルの検討

## 検証項目

- [ ] Excalidrawが正常に表示される
- [ ] 基本的な描画操作ができる
- [ ] レスポンシブデザインが機能する
- [ ] エラーハンドリングが適切

## 問題記録

発生した問題は以下の形式で記録：

```markdown
# 問題: [タイトル]
発生箇所: frontend/src/components/...
症状: [詳細な症状]
原因: [特定した原因]
解決方法: [実施した対策]
```

## 完了条件

- [ ] Reactプロジェクトが正常に起動する
- [ ] Excalidrawコンポーネントが表示される
- [ ] 基本的な描画機能が動作する
- [ ] テストが通過する
- [ ] ドキュメントが整備されている