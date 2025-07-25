# ADR-002: リアルタイム同期戦略

## ステータス
承認済み

## コンテキスト
複数ユーザー間でExcalidrawの描画データをリアルタイムで同期する方法を決定する必要がある。

## 決定
1. シーン全体の同期方式を採用（差分同期ではなく）
2. スロットリングによるネットワーク負荷の軽減
3. バージョン番号による競合解決
4. ポインター位置は高頻度更新を許容

## 理由
- シーン全体同期は実装がシンプルで一貫性を保ちやすい
- スロットリングにより、高頻度の更新でもサーバー負荷を抑制
- Excalidrawの要素にはバージョン情報が含まれているため活用

## 結果
- シンプルで理解しやすい同期ロジック
- ネットワーク帯域の効率的な利用
- スケーラビリティの確保

## 欠点
- 大量の要素がある場合、データ量が大きくなる
- 差分同期に比べて帯域幅を消費する

## 実装詳細

### SyncService
- `broadcastSceneChange()`: シーン変更をブロードキャスト（100msスロットル）
- `broadcastPointerUpdate()`: ポインター位置をブロードキャスト（50msスロットル）
- `reconcileElements()`: 要素の競合解決

### スロットリング戦略
- シーン更新: 100ms間隔でスロットル
- ポインター更新: 50ms間隔でスロットル
- 変更検出: JSON文字列比較による差分検出

### 競合解決
1. バージョン番号による比較（優先）
2. 更新時刻による比較（代替）
3. リモート優先（デフォルト）

## 技術的な考慮事項
- Socket.IOを使用したリアルタイム通信
- TypeScript型安全性の確保
- メモリリーク防止のためのクリーンアップ機能
- エラーハンドリングとグレースフルな劣化

## テスト戦略
- ユニットテスト: SyncServiceの各機能
- E2Eテスト: 複数ブラウザでの同期確認
- パフォーマンステスト: スロットリング効果の確認