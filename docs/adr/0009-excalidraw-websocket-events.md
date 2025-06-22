# ADR-0009: Excalidraw WebSocketイベント調査結果

## ステータス
承認済み

## 決定日
2025-06-22

## 背景
excalidraw-roomサーバーとの正しい通信を実装するため、公式のWebSocketイベント名を調査する必要があった。

## 調査結果

### 1. excalidraw-roomサーバー側イベント（公式）

**受信イベント（クライアントからサーバーへ）:**
- `join-room` - ルーム参加
- `server-broadcast` - 通常のブロードキャスト（確実な配信）
- `server-volatile-broadcast` - 揮発性ブロードキャスト（高速だが配信保証なし）
- `user-follow` - ユーザーフォロー機能
- `disconnecting` - 切断中
- `disconnect` - 切断完了

**送信イベント（サーバーからクライアントへ）:**
- `init-room` - ルーム初期化
- `first-in-room` - ルーム内初回参加者
- `new-user` - 新規ユーザー参加通知
- `room-user-change` - ルーム内ユーザー変更
- `client-broadcast` - クライアントへのブロードキャスト
- `user-follow-room-change` - フォロー状態変更
- `broadcast-unfollow` - フォロー解除通知

### 2. Excalidrawクライアント側実装

**主要なWebSocketイベント:**
- `socket.emit("join-room", roomId)` - ルーム参加
- `socket.on("init-room")` - ルーム初期化の受信
- `socket.on("new-user")` - 新規ユーザー参加の受信
- `socket.on("room-user-change")` - ユーザー変更の受信

**メッセージタイプ定数:**
- `WS_EVENTS.SERVER` - 通常のサーバーブロードキャスト
- `WS_EVENTS.SERVER_VOLATILE` - 揮発性サーバーブロードキャスト
- `WS_EVENTS.USER_FOLLOW_CHANGE` - ユーザーフォロー変更

**サブタイプ定数:**
- `WS_SUBTYPES.INIT` - 初期化
- `WS_SUBTYPES.UPDATE` - 更新
- `WS_SUBTYPES.IDLE_STATUS` - アイドル状態
- `WS_SUBTYPES.MOUSE_LOCATION` - マウス位置
- `WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS` - ユーザー表示範囲

### 3. データ構造

**UserToFollow:**
```typescript
{
  socketId: string;
  username: string;
}
```

**OnUserFollowedPayload:**
```typescript
{
  userToFollow: UserToFollow;
  action: "FOLLOW" | "UNFOLLOW";
}
```

### 4. 実装上の注意点

1. **暗号化データ**: クライアント間のデータは暗号化されてArrayBufferで送信される
2. **ルーム管理**: Socket.IOのroom機能を使用して関連するクライアントのみに配信
3. **バージョン管理**: 要素の同期には`broadcastedElementVersions`マップを使用
4. **競合解決**: `versionNonce`フィールドでバージョン競合を解決

### 5. 接続フロー

1. クライアントがWebSocket接続を確立
2. `join-room`イベントでルームID送信
3. サーバーが`init-room`または`first-in-room`で応答
4. 他のユーザーに`new-user`イベントを送信
5. `room-user-change`でユーザーリスト更新
6. `server-broadcast`/`server-volatile-broadcast`でシーン更新を配信

### 6. 推奨実装パターン

```typescript
// ルーム参加
socket.emit("join-room", roomId);

// イベントリスナー設定
socket.on("init-room", () => { /* 初期化処理 */ });
socket.on("new-user", () => { /* 新規ユーザー処理 */ });
socket.on("room-user-change", (users) => { /* ユーザーリスト更新 */ });
socket.on("client-broadcast", (data) => { /* シーン更新 */ });

// データ送信
socket.emit("server-broadcast", encryptedData);
// または高速配信用
socket.emit("server-volatile-broadcast", encryptedData);
```

## 決定
公式のexcalidraw-roomサーバーのイベント名とクライアント実装パターンに準拠してWebSocket通信を実装する。

## 影響
- WebSocketClient.tsの実装を公式仕様に合わせて修正が必要
- テストコードも公式イベント名に対応する必要がある
- 暗号化機能の検討が必要（現時点では平文で実装予定）

## 参考資料
- [excalidraw-room GitHub](https://github.com/excalidraw/excalidraw-room)
- [Excalidraw Portal.tsx](https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/collab/Portal.tsx)
- [Building Excalidraw's P2P Collaboration](https://plus.excalidraw.com/blog/building-excalidraw-p2p-collaboration-feature)