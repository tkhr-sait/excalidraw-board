# タスク04: バックエンド接続検証

## 目的

Docker Hubの公式excalidraw-roomを使用して、WebSocket接続の動作を検証し、通信プロトコルを理解する。

## 前提条件

- [ ] タスク03（開発環境構築）が完了していること
- [ ] Dockerが正常に動作していること
- [ ] WebSocket通信の基本知識があること

## 検証項目

### 1. excalidraw-roomの起動検証

- [ ] Dockerイメージのpull
- [ ] コンテナの起動確認
- [ ] ポートの疎通確認
- [ ] ログの確認

### 2. WebSocket接続テスト

- [ ] 基本的な接続確立
- [ ] メッセージの送受信
- [ ] 切断と再接続
- [ ] エラーハンドリング

### 3. プロトコル分析

- [ ] 接続時のハンドシェイク
- [ ] メッセージフォーマットの解析
- [ ] イベントタイプの特定
- [ ] データ同期の仕組み

### 4. 複数クライアント検証

- [ ] 同時接続のテスト
- [ ] ブロードキャストの動作確認
- [ ] 同期の整合性確認
- [ ] パフォーマンス測定

## 成果物

- [ ] 接続検証レポート（docs/adr/0008-backend-verification.md）
- [ ] WebSocketクライアントのサンプル実装（samples/websocket-client/）
- [ ] プロトコル仕様書の更新
- [ ] 問題点と対策の文書化

## 実施手順

1. excalidraw-roomの起動
   ```bash
   # イメージの取得
   docker pull excalidraw/excalidraw-room:latest
   
   # コンテナの起動
   docker run -d \
     --name excalidraw-room \
     -p 3002:80 \
     excalidraw/excalidraw-room
   
   # ログの確認
   docker logs -f excalidraw-room
   ```

2. 簡易WebSocketクライアントの作成
   ```typescript
   // samples/websocket-client/index.ts
   import { io } from 'socket.io-client';
   
   const socket = io('ws://localhost:3002', {
     transports: ['websocket']
   });
   
   socket.on('connect', () => {
     console.log('Connected:', socket.id);
   });
   
   socket.on('message', (data) => {
     console.log('Received:', data);
   });
   ```

3. プロトコル解析
   - Chrome DevToolsでWebSocket通信を監視
   - メッセージフォーマットの記録
   - イベントフローの図式化

4. 負荷テスト
   ```typescript
   // 複数クライアントの同時接続テスト
   const clients = [];
   for (let i = 0; i < 10; i++) {
     const client = io('ws://localhost:3002');
     clients.push(client);
   }
   ```

## 検証シナリオ

### シナリオ1: 基本接続
1. クライアントが接続
2. 初期データの受信確認
3. 正常切断

### シナリオ2: データ同期
1. クライアントAが図形を追加
2. クライアントBで変更を受信
3. データの整合性確認

### シナリオ3: 異常系
1. ネットワーク切断のシミュレーション
2. 再接続の動作確認
3. データ復旧の確認

## トラブルシューティング

### よくある問題

1. **接続できない場合**
   ```bash
   # ポートの確認
   docker ps
   netstat -an | grep 3002
   
   # ファイアウォールの確認
   sudo iptables -L
   ```

2. **CORSエラーが発生する場合**
   - excalidraw-roomの設定確認
   - プロキシ設定の検討

3. **メッセージが受信できない場合**
   - イベント名の確認
   - データフォーマットの確認

## 記録すべき情報

- [ ] WebSocketのエンドポイントURL
- [ ] 使用されているSocket.IOのバージョン
- [ ] サポートされているイベント一覧
- [ ] メッセージのスキーマ定義
- [ ] 認証方式（もしあれば）

## 完了条件

- [ ] excalidraw-roomが正常に起動する
- [ ] WebSocket接続が確立できる
- [ ] 基本的なメッセージ送受信ができる
- [ ] プロトコル仕様が文書化されている
- [ ] 次のタスクに必要な情報が揃っている