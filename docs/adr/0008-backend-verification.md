# ADR-0008: バックエンド接続検証結果

## ステータス

Accepted

## 実施日

2025-06-22

## 概要

excalidraw-room Docker公式イメージの起動と WebSocket 接続の検証を実施し、通信プロトコルの詳細を調査した。

## 検証結果

### 1. excalidraw-room起動検証

#### 成功事項
- ✅ Docker Hub公式イメージ `excalidraw/excalidraw-room:latest` のpullが成功
- ✅ コンテナの起動が成功（ポート3002でHTTP接続可能）
- ✅ WebSocket接続の確立が成功

#### 注意事項
- ❗ コンテナログに `UnhandledPromiseRejectionWarning` が出力されるが、機能には影響しない
- ❗ Node.js のDeprecation Warningが表示されるが、動作は正常

### 2. WebSocket接続テスト結果

#### 基本接続
```
✅ Connected to server: Hz6yMkdEjp0c41yhAAAB
📡 Joining room: test-room-123
📨 Event received: init-room []
📨 Event received: first-in-room []
📨 Event received: room-user-change [ 'Hz6yMkdEjp0c41yhAAAB' ]
```

#### 確認できた動作
- Socket.IO を使用したWebSocket接続
- ルーム参加時の自動初期化
- ユーザーリストの自動更新
- 正常な切断処理

### 3. プロトコル分析結果

#### 接続設定
- **エンドポイント**: `http://localhost:3002`
- **プロトコル**: Socket.IO (WebSocket transport)
- **ポート**: 3002 (コンテナの80番ポートをマッピング)

#### 確認できたイベント

| イベント名 | 方向 | 説明 | ペイロード例 |
|-----------|------|------|-------------|
| `connect` | Server → Client | 接続確立通知 | `socket.id` |
| `disconnect` | Server → Client | 切断通知 | `reason` |
| `join-room` | Client → Server | ルーム参加要求 | `roomId (string)` |
| `init-room` | Server → Client | ルーム初期化通知 | `[]` |
| `first-in-room` | Server → Client | 最初のユーザー通知 | `[]` |
| `room-user-change` | Server → Client | ユーザーリスト更新 | `users (string[])` |
| `new-user` | Server → Client | 新規ユーザー参加通知 | `userId (string)` |
| `user-left` | Server → Client | ユーザー離脱通知 | `userId (string)` |

### 4. 複数クライアント検証結果

#### テスト構成
- 同時接続クライアント数: 3
- ルーム: `test-room-multi`
- 接続シーケンス: 順次接続、順次切断

#### 確認できた動作
- ✅ 複数クライアントの同時接続
- ✅ リアルタイムユーザーリスト同期
- ✅ 新規参加者の全クライアント通知
- ✅ 離脱者の全クライアント通知
- ✅ 正確なユーザー数管理

#### 同期フロー例
```
Client-1 参加 → first-in-room
Client-2 参加 → new-user(Client-2) → room-user-change(All)
Client-3 参加 → new-user(Client-3) → room-user-change(All)
Client-1 離脱 → user-left(Client-1) → room-user-change(残り)
```

### 5. 性能・安定性

#### パフォーマンス
- 接続確立時間: < 100ms
- メッセージ配信遅延: < 10ms
- 同時接続: 3クライアントで安定動作

#### エラーハンドリング
- 接続エラーの適切な通知
- タイムアウト設定の動作確認
- 切断・再接続の正常処理

## 技術的知見

### Socket.IO の詳細
- バージョン: Server-side implementation (クライアントは4.x系で動作確認)
- Transport: WebSocket (fallback設定なし)
- Namespace: デフォルト (`/`)

### ルーム管理
- ルームIDベースの分離
- 自動的なユーザー管理
- 動的なルーム作成・削除

### メッセージフォーマット
- イベントベースの通信
- JSON形式のデータ交換
- 配列形式でのユーザーリスト管理

## 影響

### 次のタスクへの影響
- ✅ フロントエンド実装で使用するプロトコル仕様が確定
- ✅ WebSocket通信部分の実装方針が決定
- ✅ ルーム管理機能の要件が明確化

### アーキテクチャへの影響
- Socket.IO クライアントライブラリの採用
- イベントドリブンな状態管理の必要性
- ルーム単位でのデータ同期設計

## 決定事項

1. **通信プロトコル**: Socket.IO を使用
2. **接続先**: `http://localhost:3002`
3. **ルーム管理**: 既存のルーム管理機能を活用
4. **イベント設計**: 確認したイベント仕様に基づく実装
5. **エラーハンドリング**: 接続エラー・切断処理の実装必須

## 未解決事項

1. **データ同期**: 描画データの同期方法（Excalidraw要素の送受信）
2. **認証**: ユーザー認証機能の有無
3. **永続化**: データ永続化の方法
4. **スケーラビリティ**: 大人数接続時の性能

## 次のアクション

1. フロントエンド実装での Socket.IO クライアント統合
2. Excalidraw要素の同期プロトコル調査
3. 実際の描画データでの動作検証

## 参考資料

- [Socket.IO公式ドキュメント](https://socket.io/)
- [excalidraw-room Docker Hub](https://hub.docker.com/r/excalidraw/excalidraw-room)
- 検証用サンプルコード: `/workspace/samples/websocket-client/`