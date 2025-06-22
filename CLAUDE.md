# excalidraw-board プロジェクト

## プロジェクト概要

ExcalidrawをベースにしたリアルタイムコラボレーションボードをClaude Codeを使用して実装するプロジェクトです。

## 実装方針

### 基本原則

1. **段階的実装**: 各機能を段階的に実装し、都度検証を行う
2. **公式準拠**: GitHub公式リポジトリの実装方式に準拠（Firebase除く）
3. **ローカル完結**: 外部サービスに依存せず、ローカルネットワークで完結
4. **テストファースト**: コード実装前にテストを作成
5. **文書化**: 日本語でドキュメントを作成・管理

### 技術スタック

- **フロントエンド**: React + TypeScript（新規作成）
- **バックエンド**: excalidraw-room（Docker Hub公式版を無改造で利用）
- **テスト**: Playwright（headlessモード）
- **通信**: WebSocket（Socket.IO）

## 作業ルール

### 実装時の注意事項

1. **前提確認**: タスク実施前に必ず前提条件を確認し、満たしていない場合は相談
2. **問題記録**: 発生した問題は必ず記録に残す
3. **検証優先**: 技術的な不明点は簡易的なサンプル実装で検証してから採用
4. **ADR管理**: 調査結果、サンプル実装、技術的決定事項はADRとして記録

### ディレクトリ構造

```
excalidraw-board/
├── CLAUDE.md                    # このファイル
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   │   └── 0001-xxx.md
│   └── develop/
│       ├── tasks/              # タスクドキュメント
│       │   ├── task-01-project-analysis.md
│       │   ├── task-02-architecture-design.md
│       │   └── ...
│       └── problems/           # 問題記録
│           └── problem-xxx.md
├── frontend/                   # フロントエンド実装
├── backend/                    # バックエンド設定（Docker）
├── tests/                      # テストコード
└── samples/                    # 検証用サンプル実装
```

## タスク一覧

1. **タスク01**: プロジェクト調査・分析
   - Excalidraw公式リポジトリの分析
   - excalidraw-roomの仕様調査

2. **タスク02**: アーキテクチャ設計
   - システム全体の設計
   - 通信プロトコルの定義

3. **タスク03**: 開発環境構築
   - 開発環境のセットアップ
   - 必要なツールの導入

4. **タスク04**: バックエンド接続検証
   - excalidraw-roomの起動検証
   - WebSocket接続の確認

5. **タスク05**: フロントエンド基盤構築
   - React プロジェクトの初期設定
   - Excalidrawコンポーネントの統合

6. **タスク06**: リアルタイムコラボレーション実装
   - WebSocket通信の実装
   - 同期機能の実装

7. **タスク07**: テスト環境構築
   - Playwright環境のセットアップ
   - テスト基盤の構築

8. **タスク08**: 統合テスト実装
   - E2Eテストの実装
   - マルチユーザーシナリオのテスト

9. **タスク09**: デプロイ設定
   - Docker Composeによる構成
   - ローカルネットワークでの起動設定

## コマンド

### 開発時によく使うコマンド

```bash
# フロントエンド開発サーバー起動
cd frontend && npm run dev

# バックエンド起動
docker-compose up backend

# テスト実行
npm run test

# 型チェック
npm run typecheck

# リント
npm run lint
```

## 参考リソース

- [Excalidraw公式リポジトリ](https://github.com/excalidraw/excalidraw)
- [excalidraw-room Docker Hub](https://hub.docker.com/r/excalidraw/excalidraw-room)

## 注意事項

- Firebaseは使用しない
- 外部ドメイン、証明書サービスは利用しない
- 機能追加は現時点では計画しない
- すべての実装はローカルネットワークで完結させる