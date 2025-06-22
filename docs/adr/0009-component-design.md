# ADR-0009: フロントエンドコンポーネント設計

## ステータス

Accepted

## 実施日

2025-06-22

## 概要

Reactプロジェクトの基盤構築とExcalidrawコンポーネントの統合を完了し、フロントエンドの基本構造を確立した。

## 実装結果

### 1. プロジェクト構成

#### 技術スタック
- **フレームワーク**: React 18.2.0 + TypeScript
- **ビルドツール**: Vite 5.0.8
- **状態管理**: Jotai 2.6.0
- **ルーティング**: React Router DOM 6.20.1
- **WebSocket**: Socket.IO Client 4.7.4
- **コンポーネント**: Excalidraw 0.17.6
- **スタイリング**: Tailwind CSS 3.3.6

#### ディレクトリ構造
```
frontend/src/
├── components/
│   ├── Board/
│   │   └── CollaborativeBoard.tsx    # メインのボードコンポーネント
│   ├── Common/
│   │   ├── ErrorBoundary.tsx         # エラーハンドリング
│   │   └── WelcomeScreen.tsx         # ホーム画面
│   └── Header/
│       └── Header.tsx                # ヘッダーコンポーネント
├── stores/
│   └── atoms/
│       └── boardAtoms.ts             # Jotai状態管理
├── App.tsx                           # メインアプリケーション
└── main.tsx                          # エントリーポイント
```

### 2. コンポーネント設計

#### App.tsx
- Jotai Provider でのグローバル状態管理
- ErrorBoundary でのエラーハンドリング
- React Router での画面遷移管理

```typescript
<Provider>
  <ErrorBoundary>
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/room/:roomId" element={<CollaborativeBoard />} />
      </Routes>
    </Router>
  </ErrorBoundary>
</Provider>
```

#### CollaborativeBoard.tsx
- Excalidrawコンポーネントの統合
- URL パラメータからのルームID取得
- 描画状態変更のハンドリング

```typescript
<Excalidraw
  onChange={handleChange}
  initialData={{
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
  }}
/>
```

#### ErrorBoundary.tsx
- React Error Boundary の実装
- ユーザーフレンドリーなエラー表示
- リロード機能付きエラー回復

#### WelcomeScreen.tsx
- ホーム画面UI
- 新規ルーム作成機能
- 既存ルーム参加機能

#### Header.tsx
- アプリケーションヘッダー
- ルーム情報表示
- ルーム共有機能（予定）

### 3. 状態管理設計

#### Jotai Atoms構成
```typescript
// Board状態
elementsAtom: readonly any[]           // 描画要素
appStateAtom: any                      // アプリケーション状態

// 接続状態
connectionStatusAtom: 'connecting' | 'connected' | 'disconnected'
roomIdAtom: string | null              // 現在のルームID
connectedUsersAtom: string[]           // 接続中ユーザー

// 派生状態
isConnectedAtom: boolean               // 接続状態の判定
```

### 4. 型安全性の課題と対策

#### 発生した問題
Excalidraw v0.17.6 では型定義の export に問題があり、以下のエラーが発生：
```
TS2459: Module '"@excalidraw/excalidraw/types/types"' declares 'ExcalidrawElement' locally, but it is not exported.
```

#### 採用した対策
現段階では `any` 型を使用し、機能実装を優先：
```typescript
const handleChange = (elements: readonly any[], _appState: any) => {
  // 処理
};
```

#### 今後の改善方針
1. Excalidraw の型定義更新待ち
2. 独自型定義の作成検討
3. TypeScript strict モードでの検証

### 5. 確認できた動作

#### 基本機能
- ✅ Vite 開発サーバーの起動（http://localhost:5173）
- ✅ TypeScript コンパイル通過
- ✅ React アプリケーションの基本構造
- ✅ Excalidraw コンポーネントの統合

#### UI/UX
- ✅ レスポンシブデザイン（Tailwind CSS）
- ✅ ルーティング機能（React Router）
- ✅ エラーハンドリング（Error Boundary）
- ✅ 状態管理基盤（Jotai）

#### 予定機能（未実装）
- 🔄 WebSocket 接続機能
- 🔄 リアルタイム同期
- 🔄 マルチユーザー対応

## 技術的決定事項

### 1. 状態管理ライブラリ選定
**選択**: Jotai
**理由**: 
- Atomic な状態管理でパフォーマンス最適化
- TypeScript サポートが優秀
- Excalidraw の状態と相性が良い

### 2. CSS フレームワーク選定
**選択**: Tailwind CSS（既存）
**理由**:
- Utility-first で高速開発
- カスタマイズ性が高い
- プロジェクトで既に採用済み

### 3. 型安全性の扱い
**選択**: 段階的な型安全性向上
**理由**:
- Excalidraw の型定義問題を回避
- 機能実装を優先し、後で型定義を改善

## 影響

### 次のタスクへの影響
- ✅ WebSocket 接続実装の基盤が完成
- ✅ リアルタイム同期の状態管理準備完了
- ✅ UI コンポーネントの基本構造確立

### 開発効率への影響
- 🚀 Vite による高速な開発体験
- 🛡️ TypeScript による型安全性（部分的）
- 🎨 Tailwind による高速 UI 開発

## 未解決事項

1. **型定義の完全性**: Excalidraw の型エクスポート問題
2. **WebSocket 統合**: 状態管理との連携設計
3. **テスト戦略**: コンポーネントテストの実装方針
4. **パフォーマンス**: 大量描画要素での最適化

## 次のアクション

1. **タスク06**: WebSocket 接続とリアルタイム同期の実装
2. **型定義改善**: Excalidraw の型問題解決
3. **テスト実装**: 基本コンポーネントのテスト作成
4. **パフォーマンス検證**: 描画パフォーマンスの測定

## 参考資料

- [Excalidraw公式ドキュメント](https://docs.excalidraw.com/)
- [Jotai公式ドキュメント](https://jotai.org/)
- [React Router公式ドキュメント](https://reactrouter.com/)
- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/)