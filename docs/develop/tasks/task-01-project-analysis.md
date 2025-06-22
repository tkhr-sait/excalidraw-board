# タスク01: プロジェクト調査・分析

## 目的

Excalidraw公式リポジトリとexcalidraw-roomの実装を調査し、リアルタイムコラボレーション機能の仕組みを理解する。

## 前提条件

- インターネット接続が可能であること
- GitHubへのアクセスが可能であること
- Docker Hubへのアクセスが可能であること

## 調査項目

### 1. Excalidraw公式リポジトリの調査

- [x] excalidraw-app/App.tsxの構造分析
- [x] excalidraw-app/collab/Collab.tsxの実装分析
- [x] WebSocket通信の実装方式
- [x] 状態管理の仕組み
- [x] Firebase部分の依存関係

### 2. excalidraw-roomの調査

- [x] Docker Hubの公式イメージ仕様確認
- [x] 必要な環境変数
- [x] ポート設定
- [x] WebSocketプロトコル仕様
- [x] 認証・セキュリティ設定

### 3. 技術要素の整理

- [x] 使用されているライブラリ一覧
- [x] 通信プロトコルの詳細
- [x] データ同期の仕組み
- [x] エラーハンドリング方式

## 成果物

- [x] 調査結果レポート（docs/adr/0001-excalidraw-analysis.md）
- [x] 通信プロトコル仕様書（docs/adr/0002-websocket-protocol.md）
- [x] Firebase代替案の検討結果（docs/adr/0003-firebase-alternative.md）

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

- [x] WebSocketプロトコルの動作確認
- [x] excalidraw-roomとの接続テスト
- [x] データ同期の基本動作

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

- [x] すべての調査項目が完了している
- [x] 成果物がすべて作成されている
- [x] 検証項目がすべて確認されている
- [x] 次のタスクに必要な情報が揃っている

## 実施結果

### 検証結果詳細

#### WebSocketプロトコルの動作確認
**検証日時**: 2025-06-22  
**検証環境**: excalidraw/excalidraw-room:latest (localhost:3003)  
**結果**: ✅ 成功
- Socket.IO接続確立確認
- `join-room`イベント送信成功
- `init-room`, `first-in-room`, `room-user-change`イベント受信確認

#### excalidraw-roomとの接続テスト
**検証日時**: 2025-06-22  
**検証ツール**: samples/websocket-client/index.js  
**結果**: ✅ 成功
- HTTP接続: 200 OK
- WebSocket接続: 正常確立
- ルーム管理機能: 正常動作

#### データ同期の基本動作
**検証内容**: 基本的なイベント送受信  
**結果**: ✅ 成功
- ルーム参加フロー確認
- ユーザー管理イベント確認
- 基本的なプロトコル互換性確認

### 重要な発見事項

1. **excalidraw-room仕様**:
   - Node.js v12.22.12ベース
   - ポート80でHTTP/WebSocket両方対応
   - 基本的なルーム管理機能のみ実装

2. **プロトコル互換性**:
   - Socket.IOの標準的な使用方法
   - 公式Excalidrawとの互換性あり
   - Firebase依存部分は分離可能

3. **実装の方向性**:
   - Socket.IO + React + TypeScriptで実装可能
   - Jotai状態管理が適している
   - JSONファイルベースの永続化で十分

### 次のタスクへの情報

タスク02（アーキテクチャ設計）に必要な情報がすべて整いました：
- 技術スタック決定済み
- プロトコル仕様明確化済み
- Firebase代替案確定済み