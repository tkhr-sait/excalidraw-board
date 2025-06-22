# ADR-0002: WebSocketプロトコル仕様分析

## ステータス
承認済み

## コンテキスト
excalidraw-roomとの互換性を確保するため、Excalidraw公式のWebSocketプロトコルを分析し、実装すべき仕様を明確にした。

## プロトコル仕様

### 1. 基本通信

#### 使用ライブラリ
- **Socket.IO**: WebSocketラッパー
- **Transport**: `["websocket", "polling"]` （WebSocket優先、HTTP polling フォールバック）
- **接続URL**: 環境変数 `VITE_APP_WS_SERVER_URL` で設定

#### 接続フロー
1. Socket.IO接続確立
2. `join-room` イベントでルーム参加
3. `room-user-change` で参加者リスト受信
4. `new-user` / `first-in-room` で状態通知

### 2. イベント仕様

#### サーバー送信イベント
```typescript
// ルーム管理
'init-room': [] // ルーム初期化
'first-in-room': [] // 最初の参加者
'room-user-change': [userIds: string[]] // 参加者変更
'new-user': userData // 新規参加者
'user-left': userData // 参加者退出

// データ同期（推測）
'server-broadcast': syncData // 確実な配信
'server-volatile-broadcast': volatileData // 高頻度データ
```

#### クライアント送信イベント
```typescript
'join-room': roomId: string // ルーム参加
'leave-room': roomId: string // ルーム退出（推測）
```

### 3. 実装詳細

#### 接続設定
```javascript
const socket = io(serverUrl, {
  transports: ['websocket'],
  autoConnect: true,
  timeout: 5000
});
```

#### ルーム管理
- **ルームID**: 20文字のランダム文字列（10バイトのhex）
- **暗号化キー**: エンドツーエンド暗号化用
- **URL形式**: `#room={roomId},{roomKey}`

### 4. データ同期戦略

#### Excalidraw公式実装の同期方式
1. **増分更新**: 変更要素のみ送信
2. **フル同期**: 20秒間隔で全要素同期
3. **バージョン管理**: `broadcastedElementVersions`で重複排除
4. **調整処理**: `reconcileElements()`でマージ

#### スロットリング設定
- **カーソル同期**: 33ms（約30fps）
- **ファイルアップロード**: 300ms
- **フル同期**: 20秒

#### メッセージタイプ（推測）
```typescript
enum WS_EVENTS {
  SERVER_VOLATILE = 'server-volatile-broadcast', // マウス移動等
  SERVER = 'server-broadcast', // 要素更新等
  USER_FOLLOW_CHANGE = 'user-follow-change',
  USER_FOLLOW_ROOM_CHANGE = 'user-follow-room-change'
}

enum WS_SUBTYPES {
  SCENE_INIT = 'SCENE_INIT', // 初期シーン
  SCENE_UPDATE = 'SCENE_UPDATE', // 増分更新
  MOUSE_LOCATION = 'MOUSE_LOCATION', // カーソル位置
  IDLE_STATUS = 'IDLE_STATUS', // アイドル状態
  USER_VISIBLE_SCENE_BOUNDS = 'USER_VISIBLE_SCENE_BOUNDS' // 表示範囲
}
```

### 5. excalidraw-room検証結果

#### Docker Hub公式イメージ分析
- **イメージ**: `excalidraw/excalidraw-room:latest`
- **ポート**: `80/tcp`
- **Node.js**: v12.22.12
- **起動コマンド**: `yarn start`
- **作業ディレクトリ**: `/excalidraw-room`

#### 動作確認結果
```
✅ HTTP接続成功: 200 OK
✅ Socket.IO接続成功
✅ ルーム参加成功: join-room イベント
✅ 基本イベント受信: init-room, first-in-room, room-user-change
```

#### 対応イベント確認
- `join-room` → `init-room`
- `join-room` → `first-in-room` （初回参加時）
- `join-room` → `room-user-change` （参加者リスト）

### 6. セキュリティ要件

#### Excalidraw公式の暗号化
- **エンドツーエンド暗号化**: ルームキーによる暗号化
- **Firebase保存**: 暗号化されたデータのみ保存
- **IV使用**: 初期化ベクトルによる暗号強度向上

#### 我々の実装方針
- **ローカル環境**: 暗号化を簡素化する可能性
- **HTTPS非必須**: ローカルネットワーク前提
- **認証簡素化**: Firebase認証を使用しない

## 決定事項

### 採用する仕様
1. **Socket.IO**: WebSocket通信ライブラリ
2. **ルーム管理**: join-room ベースの実装
3. **イベント駆動**: サーバーイベントによる状態同期
4. **互換性**: excalidraw-room公式イメージとの互換性

### 実装する機能
1. **基本接続**: Socket.IO による WebSocket接続
2. **ルーム管理**: ルーム参加・退出機能
3. **リアルタイム同期**: 増分更新による効率的同期
4. **再接続処理**: 接続断絶時の自動復旧

### 簡素化する部分
1. **暗号化**: ローカル環境のため簡素化検討
2. **認証**: Firebase認証を使用しない
3. **永続化**: Firebaseを使用しない

## 次のステップ

1. Firebase代替案の検討
2. プロトコル実装の詳細設計
3. サンプル実装による検証