# ADR-0001: Excalidraw公式実装分析結果

## ステータス
承認済み

## コンテキスト
excalidraw-boardプロジェクトの実装指針を決定するため、GitHub公式リポジトリのExcalidrawアプリケーションの実装を分析した。

## 調査結果

### 1. アーキテクチャ概要

- **メインコンポーネント**: `ExcalidrawApp` → `ExcalidrawWrapper`
- **状態管理**: Jotai（アトミック状態管理）
- **エラー処理**: `TopErrorBoundary`でアプリケーション全体をラップ
- **Provider構造**: Jotaiの`Provider`を使用

### 2. 状態管理の詳細

#### 使用されているAtom
- `collabAPIAtom`: コラボレーションAPI インスタンス
- `isCollaboratingAtom`: コラボレーション状態の追跡
- `isOfflineAtom`: オフライン状態の管理
- `shareDialogStateAtom`: 共有ダイアログの状態
- `collabErrorIndicatorAtom`: コラボレーションエラー表示

#### 状態管理の特徴
- アトミック設計により、状態の変更が局所的
- 各機能ごとに独立したatomを使用
- React hooksと組み合わせた実装

### 3. コラボレーション実装の構造

#### 主要機能
1. **自動コラボレーション検出**: URL解析による自動参加
2. **リアルタイム同期**: `syncElements`による要素同期
3. **ポインター共有**: `onPointerUpdate`による カーソル位置共有
4. **エラーハンドリング**: 専用のエラー表示システム

#### 実装パターン
```typescript
// コラボレーション開始
if (roomLinkData && opts.collabAPI) {
  const scene = await opts.collabAPI.startCollaboration(roomLinkData);
}

// 要素同期
if (collabAPI?.isCollaborating()) {
  collabAPI.syncElements(elements);
}
```

### 4. 主要な依存関係

#### 必須ライブラリ
- `@excalidraw/excalidraw`: コア機能
- `React`: UIフレームワーク
- `Jotai`: 状態管理
- `socket.io-client`: WebSocket通信

#### Firebase関連
- ファイルストレージ用途
- コラボレーション時の画像ファイル管理
- `FIREBASE_STORAGE_PREFIXES`による整理

### 5. UIコンポーネント構成

#### 主要コンポーネント
- `AppMainMenu`: メインメニュー
- `AppWelcomeScreen`: ウェルカム画面
- `ShareDialog`: 共有機能
- `LiveCollaborationTrigger`: コラボレーション開始UI
- `CollabError`: エラー表示

#### 特徴的な機能
- PWA対応（インストール促進）
- オフライン対応
- タブ同期（LocalStorage使用）
- コマンドパレット
- 視覚的デバッグ機能

### 6. パフォーマンス最適化

#### 実装されている最適化
- デバウンス処理による同期頻度制御
- 画像の遅延読み込み
- レンダリング スロットリング
- 不要な再レンダリング防止

## 実装への影響

1. **状態管理**: Jotaiの採用を検討
2. **コンポーネント設計**: 公式と同様の階層構造
3. **エラーハンドリング**: 専用のエラー表示システム
4. **パフォーマンス**: 最適化手法の適用

## 決定事項

1. **React + TypeScript**: 基本技術スタック
2. **Jotai**: 状態管理ライブラリとして採用
3. **Socket.IO**: WebSocket通信ライブラリ
4. **Firebase除外**: ローカル実装方針との整合性

## 次のステップ

1. WebSocketプロトコルの詳細分析
2. Firebase代替案の検討
3. アーキテクチャ設計への反映