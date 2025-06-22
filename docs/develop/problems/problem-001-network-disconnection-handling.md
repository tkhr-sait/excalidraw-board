# Problem 001: Network Disconnection Handling

## 問題概要

ネットワーク切断・再接続のテストが一部失敗している。特に複雑な切断・再接続シナリオでの状態管理に課題がある。

## 影響範囲

- `tests/e2e/specs/error-handling.spec.ts` の一部テスト
- `tests/e2e/collaboration.spec.ts` の切断・再接続テスト
- ユーザーが実際にネットワーク問題に遭遇した際の体験

## 具体的な失敗テスト

### 1. Network Disconnection Gracefully
- **ファイル**: `tests/e2e/specs/error-handling.spec.ts:7`
- **問題**: `context.setOffline(true)` 後に切断オーバーレイが表示されない
- **期待値**: 切断時に「Connection Lost」オーバーレイが表示される
- **実際**: オーバーレイが表示されない

### 2. User Disconnection and Reconnection  
- **ファイル**: `tests/e2e/collaboration.spec.ts:69`
- **問題**: 切断後の「Connecting」状態が検出されない
- **期待値**: 切断後に再接続試行中の状態が表示される
- **実際**: 「Connecting」テキストが見つからない

## 根本原因分析

### 1. WebSocket切断検出の遅延
```typescript
// 現状の問題：browser offline状態とWebSocket切断の検出タイミングのずれ
await context.setOffline(true);  // ブラウザをオフラインに
// WebSocketService側の切断検出が遅れている
```

### 2. 状態同期の問題
- `navigator.onLine` の状態と WebSocket接続状態の同期が取れていない
- `useCollaboration` フックでの状態管理ロジックが複雑

### 3. 自動再接続ロジックの競合
```typescript
// WebSocketServiceの自動再接続と手動再接続の競合
private handleReconnection() {
  // 自動再接続が「Connecting」状態をスキップしている可能性
}
```

## 現在の実装状況

### 動作している部分
- ✅ 基本的な接続・切断の検出
- ✅ オフライン状態の検出（navigator.onLine）
- ✅ 切断オーバーレイのUI実装

### 問題がある部分
- ❌ Playwrightテスト環境での切断シミュレーション
- ❌ 切断検出のタイミング調整
- ❌ 再接続中の中間状態表示

## 提案される解決策

### 短期対応（テスト修正）
1. **テストのタイムアウト調整**
   ```typescript
   // より長いタイムアウトで切断検出を待つ
   await page.waitForTimeout(testTimeouts.networkSimulation * 2);
   ```

2. **切断検出の強制トリガー**
   ```typescript
   // WebSocket切断を明示的にトリガー
   await page.evaluate(() => {
     if (window.websocketService) {
       window.websocketService.disconnect();
     }
   });
   ```

### 中期対応（実装改善）
1. **状態管理の改善**
   ```typescript
   // より確実な切断検出ロジック
   useEffect(() => {
     const checkConnection = () => {
       if (!navigator.onLine && isConnected) {
         setConnectionStatus('disconnected');
       }
     };
     const interval = setInterval(checkConnection, 1000);
     return () => clearInterval(interval);
   }, [isConnected]);
   ```

2. **WebSocketService の改善**
   - 切断検出の高速化
   - 再接続状態の明確化
   - テスト環境対応

### 長期対応（アーキテクチャ改善）
1. **接続状態の一元管理**
2. **より堅牢な切断・再接続ロジック**
3. **テスト用のモック機能追加**

## 影響度

- **重要度**: 中
- **緊急度**: 低
- **ユーザー影響**: 低（基本的な切断・再接続は動作）

## 次のアクション

1. [ ] テスト環境での切断シミュレーション方法の調査
2. [ ] WebSocketService の切断検出ロジック改善
3. [ ] 状態管理の簡素化
4. [ ] テストケースの見直し

## 関連ファイル

- `src/hooks/useCollaboration.ts`
- `src/services/websocket.ts`
- `src/components/Board/CollaborativeBoard.tsx`
- `tests/e2e/specs/error-handling.spec.ts`
- `tests/e2e/collaboration.spec.ts`

## 更新履歴

- 2025-06-22: 初回作成