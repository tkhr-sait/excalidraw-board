# タスク01: プロジェクト調査・分析

## 目的

Excalidraw公式リポジトリとexcalidraw-roomの実装を調査し、リアルタイムコラボレーション機能の仕組みを理解する。

## 前提条件

- インターネット接続が可能であること
- GitHubへのアクセスが可能であること
- Docker Hubへのアクセスが可能であること

## 調査項目

### 1. Excalidraw公式リポジトリの調査

- [ ] excalidraw-app/App.tsxの構造分析
- [ ] excalidraw-app/collab/Collab.tsxの実装分析
- [ ] WebSocket通信の実装方式
- [ ] 状態管理の仕組み
- [ ] Firebase部分の依存関係

### 2. excalidraw-roomの調査

- [ ] Docker Hubの公式イメージ仕様確認
- [ ] 必要な環境変数
- [ ] ポート設定
- [ ] WebSocketプロトコル仕様
- [ ] 認証・セキュリティ設定

### 3. 技術要素の整理

- [ ] 使用されているライブラリ一覧
- [ ] 通信プロトコルの詳細
- [ ] データ同期の仕組み
- [ ] エラーハンドリング方式

## 成果物

- [ ] 調査結果レポート（docs/adr/0001-excalidraw-analysis.md）
- [ ] 通信プロトコル仕様書（docs/adr/0002-websocket-protocol.md）
- [ ] Firebase代替案の検討結果（docs/adr/0003-firebase-alternative.md）

## 実施手順

1. Excalidraw公式リポジトリをクローン
   ```bash
   git clone https://github.com/excalidraw/excalidraw.git /tmp/excalidraw-official
   ```

2. 主要ファイルの分析
   - App.tsxの構造を理解
   - Collab.tsxの実装を分析
   - WebSocket通信部分を抽出

3. excalidraw-roomの仕様確認
   ```bash
   docker pull excalidraw/excalidraw-room
   docker inspect excalidraw/excalidraw-room
   ```

4. サンプル実装の作成
   - WebSocket接続の最小実装
   - 状態同期の検証コード

5. 調査結果の文書化
   - ADRフォーマットで記録
   - 重要な発見事項を整理

## 検証項目

- [ ] WebSocketプロトコルの動作確認
- [ ] excalidraw-roomとの接続テスト
- [ ] データ同期の基本動作

## 問題発生時の対応

問題が発生した場合は、以下の形式で記録する：

```markdown
# 問題: [問題のタイトル]
発生日時: YYYY-MM-DD HH:MM
状況: [発生状況の説明]
原因: [判明した原因]
対応: [実施した対応]
結果: [対応結果]
```

## 完了条件

- [ ] すべての調査項目が完了している
- [ ] 成果物がすべて作成されている
- [ ] 検証項目がすべて確認されている
- [ ] 次のタスクに必要な情報が揃っている