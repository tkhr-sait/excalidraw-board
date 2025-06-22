# タスク06: リアルタイムコラボレーション実装

## 目的

WebSocketを使用してexcalidraw-roomと連携し、複数ユーザー間でのリアルタイムコラボレーション機能を実装する。

## 前提条件

- [ ] タスク04（バックエンド接続検証）が完了していること
- [ ] タスク05（フロントエンド基盤構築）が完了していること
- [ ] WebSocketプロトコルが理解できていること
- [ ] Excalidrawの状態管理が理解できていること

## 実装項目

### 1. WebSocket接続管理

- [x] Socket.IOクライアントの実装
- [x] 接続/切断処理
- [x] 再接続ロジック
- [x] 接続状態の管理

### 2. データ同期機能

- [x] Excalidraw要素の送信
- [x] 他ユーザーからの変更受信
- [x] 状態のマージ処理
- [x] 競合解決

### 3. コラボレーション機能

- [x] ルーム（セッション）管理
- [x] ユーザープレゼンス表示
- [x] カーソル位置の共有
- [x] 選択状態の共有

### 4. エラーハンドリング

- [x] 接続エラーの処理
- [x] データ同期エラーの処理
- [x] ユーザー通知
- [x] フォールバック処理

## 成果物

- [x] WebSocketサービス実装（src/services/websocket.ts）
- [x] コラボレーションフック（src/hooks/useCollaboration.ts）
- [x] 同期ロジック実装（src/services/sync.ts）
- [x] 統合テスト

## 実施手順

1. WebSocketサービスの実装
   ```typescript
   // src/services/websocket.ts
   import { io, Socket } from 'socket.io-client';
   
   export class WebSocketService {
     private socket: Socket | null = null;
     private roomId: string | null = null;
     
     connect(url: string, roomId: string) {
       this.socket = io(url, {
         transports: ['websocket'],
         query: { roomId }
       });
       
       this.setupEventHandlers();
     }
     
     private setupEventHandlers() {
       if (!this.socket) return;
       
       this.socket.on('connect', this.handleConnect);
       this.socket.on('disconnect', this.handleDisconnect);
       this.socket.on('room-users', this.handleRoomUsers);
       this.socket.on('scene-update', this.handleSceneUpdate);
     }
   }
   ```

2. コラボレーションフックの実装
   ```typescript
   // src/hooks/useCollaboration.ts
   import { useEffect, useCallback } from 'react';
   import { ExcalidrawElement } from '@excalidraw/excalidraw/types/types';
   
   export function useCollaboration(roomId: string) {
     const [isConnected, setIsConnected] = useState(false);
     const [collaborators, setCollaborators] = useState([]);
     
     const sendUpdate = useCallback((elements: ExcalidrawElement[]) => {
       // 変更を送信
     }, []);
     
     return {
       isConnected,
       collaborators,
       sendUpdate
     };
   }
   ```

3. Excalidrawとの統合
   ```typescript
   // src/components/Board/CollaborativeBoard.tsx
   import { Excalidraw } from "@excalidraw/excalidraw";
   import { useCollaboration } from "../../hooks/useCollaboration";
   
   export function CollaborativeBoard({ roomId }: { roomId: string }) {
     const { isConnected, sendUpdate } = useCollaboration(roomId);
     
     const handleChange = (elements: ExcalidrawElement[]) => {
       sendUpdate(elements);
     };
     
     return (
       <Excalidraw
         onChange={handleChange}
         onCollabButtonClick={() => {}}
         // その他の設定
       />
     );
   }
   ```

## テスト実装

### 単体テスト

```typescript
// tests/unit/services/websocket.test.ts
describe('WebSocketService', () => {
  beforeEach(() => {
    // モックサーバーのセットアップ
  });
  
  it('should connect to server', async () => {
    // テスト実装
  });
  
  it('should handle reconnection', async () => {
    // テスト実装
  });
});
```

### 統合テスト（Playwright）

```typescript
// tests/e2e/collaboration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Collaboration', () => {
  test('two users can collaborate', async ({ browser }) => {
    // 2つのブラウザコンテキストを作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // 同じルームに参加
    await page1.goto('/room/test-room');
    await page2.goto('/room/test-room');
    
    // ユーザー1が図形を描画
    // ユーザー2で確認
  });
});
```

## 同期アルゴリズム

1. **楽観的更新**
   - ローカルで即座に更新
   - サーバーに送信
   - 他のクライアントからの更新をマージ

2. **競合解決**
   - タイムスタンプベース
   - 最後の更新が優先

3. **差分同期**
   - 変更された要素のみ送信
   - 帯域幅の最適化

## パフォーマンス考慮事項

- [x] デバウンス/スロットリングの実装
- [x] バッチ処理での送信
- [x] 大きなデータの圧縮
- [x] 不要な再レンダリングの防止

## エラーシナリオ

1. **ネットワーク切断**
   - ローカルストレージへの保存
   - 再接続時の同期

2. **サーバーエラー**
   - エラーメッセージの表示
   - リトライ処理

3. **データ不整合**
   - 全データの再同期
   - ユーザーへの通知

## 完了条件

- [x] WebSocket接続が確立できる
- [x] リアルタイムで図形が同期される
- [x] 複数ユーザーでの動作確認完了
- [x] エラーハンドリングが適切
- [x] パフォーマンスが許容範囲内