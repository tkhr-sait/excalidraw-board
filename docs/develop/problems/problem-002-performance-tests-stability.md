# Problem 002: Performance Tests Stability

## 問題概要

パフォーマンステストが不安定で、高負荷時やストレステスト環境で頻繁に失敗する。

## 影響範囲

- `tests/e2e/specs/performance.spec.ts` の全般
- 高負荷環境でのアプリケーション安定性
- CI/CD環境でのテスト実行

## 具体的な失敗テスト

### 1. Large Number of Elements Efficiently
- **ファイル**: `tests/e2e/specs/performance.spec.ts:7`
- **問題**: 大量要素作成時のタイムアウト
- **期待値**: 100個以上の要素を効率的に処理
- **実際**: テストタイムアウト（30秒）

### 2. Multiple Users with Heavy Load
- **ファイル**: `tests/e2e/specs/performance.spec.ts:70`
- **問題**: 複数ユーザー高負荷時の安定性
- **期待値**: 3ユーザーが同時に高頻度で描画操作
- **実際**: テスト中断（Test was interrupted）

### 3. WebSocket Message Throughput
- **ファイル**: `tests/e2e/specs/performance.spec.ts:223`
- **問題**: メッセージスループット測定の失敗
- **期待値**: 高頻度WebSocketメッセージの処理
- **実際**: パフォーマンス要件を満たさない

### 4. Memory Leaks During Extended Use
- **ファイル**: `tests/e2e/specs/performance.spec.ts:334`
- **問題**: 長時間使用でのメモリリーク検出
- **期待値**: メモリ使用量の安定性
- **実際**: メモリリークの可能性

## 根本原因分析

### 1. テスト環境の制約
```typescript
// 現在の問題：テスト環境でのリソース制限
// - CPU使用率の制限
// - メモリ使用量の制限  
// - ネットワーク帯域の制限
```

### 2. 非同期処理の競合
```typescript
// 大量の同期処理による競合状態
await Promise.all([
  user1.drawRectangle(...),
  user2.drawRectangle(...),
  user3.drawRectangle(...),
]); // リソース競合が発生
```

### 3. Excalidrawの内部処理負荷
- Canvas描画処理の重さ
- 要素数増加による指数的な処理時間増加
- 描画最適化の不足

### 4. WebSocket処理のボトルネック
```typescript
// メッセージキューイングによる遅延
sendSceneUpdate(elements, appState); // 頻繁な送信で詰まり
```

## 現在の実装状況

### 動作している部分
- ✅ 軽量な描画操作（数個の要素）
- ✅ 基本的な複数ユーザー接続
- ✅ 短時間での操作

### 問題がある部分  
- ❌ 大量要素（100+）の処理
- ❌ 高頻度同時操作
- ❌ 長時間実行テスト
- ❌ メモリ使用量最適化

## 提案される解決策

### 短期対応（テスト修正）
1. **タイムアウト時間の延長**
   ```typescript
   test('performance test', async ({ page }) => {
     test.setTimeout(120000); // 2分に延長
   });
   ```

2. **テスト規模の縮小**
   ```typescript
   // 要素数を現実的な範囲に調整
   const ELEMENT_COUNT = 50; // 100 -> 50に削減
   ```

3. **処理間隔の調整**
   ```typescript
   // 操作間隔を追加してリソース競合を回避
   await page.waitForTimeout(100); // 各操作間に待機
   ```

### 中期対応（最適化）
1. **描画処理の最適化**
   ```typescript
   // バッチ処理による最適化
   const sendSceneUpdateBatched = useMemo(() => 
     debounce(sendSceneUpdate, 100), [sendSceneUpdate]
   );
   ```

2. **メモリ管理の改善**
   ```typescript
   // 不要なオブジェクトのクリーンアップ
   useEffect(() => {
     return () => {
       // クリーンアップ処理
     };
   }, []);
   ```

3. **WebSocket最適化**
   ```typescript
   // メッセージ圧縮と優先度制御
   const optimizedSend = (data) => {
     if (messageQueue.length > MAX_QUEUE_SIZE) {
       // 古いメッセージを破棄
     }
   };
   ```

### 長期対応（アーキテクチャ改善）
1. **仮想化された描画**
2. **WebWorkerでの処理分散**
3. **効率的な状態管理**

## 対処方針

### 即座に対応すべき項目
1. **テストタイムアウトの現実的な設定**
2. **テスト負荷の段階的調整**
3. **CI環境でのリソース確保**

### 中期的に改善すべき項目
1. **パフォーマンス最適化**
2. **メモリリーク対策**
3. **負荷分散機能**

### 長期的な目標
1. **スケーラブルなアーキテクチャ**
2. **高負荷対応**
3. **企業レベルの安定性**

## 影響度

- **重要度**: 中
- **緊急度**: 低
- **ユーザー影響**: 低（通常使用では問題なし）

## 次のアクション

1. [ ] パフォーマンステストの現実的な基準設定
2. [ ] アプリケーションのパフォーマンス測定
3. [ ] ボトルネック箇所の特定
4. [ ] 段階的な最適化実装

## 関連ファイル

- `tests/e2e/specs/performance.spec.ts`
- `src/hooks/useCollaboration.ts`
- `src/services/websocket.ts`
- `src/components/Board/CollaborativeBoard.tsx`
- `playwright.config.ts`

## 更新履歴

- 2025-06-22: 初回作成