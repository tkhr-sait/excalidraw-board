# Excalidraw Board プロジェクト作業ガイド

## プロジェクト概要
- **プロジェクト名**: excalidraw-board
- **目的**: excalidrawを利用したリアルタイムコラボレーションシステムの構築
- **特徴**: 
  - ローカルネットワークでセルフホスティング可能
  - Firebase非使用
  - 10名以下での利用を想定

## アーキテクチャ
- **フロントエンド**: React + TypeScript + @excalidraw/excalidraw（新規作成）
- **バックエンド**: excalidraw-room (Docker公式イメージを無改造で使用)
- **通信プロトコル**: WebSocket

## 作業ルール

### 1. 開発プロセス
- 作業実施後、検証項目を確認し、対応状況を更新する
- コード作成前にテストコードを作成（TDD）
- コード作成前後にADRを確認し、方針に準拠していることを確認
- 各作業終了前にテストコードがすべて正常終了することを確認

### 2. 技術検証
- 技術的な不明点は、簡易的なサンプル実装をおこなってから採用
- サンプル実装は `docs/investigation/sample/` に保存

### 3. ドキュメント管理
- ADR（Architecture Decision Records）: `docs/develop/adr/` で管理
- 課題管理: `docs/develop/issue/` で管理
- 調査結果: `docs/investigation/` に保存
- タスク管理: `docs/develop/tasks/task-{00}-{taskname}.md` 形式で作成
- ドキュメントは日本語ベースで管理
- 図の描画はMermaid形式を使用

### 4. テスト
- Playwrightをheadlessモードで利用
- スクリーンショットは毎回取得
- 単体テスト: Jest
- E2Eテスト: Playwright

### 5. 実装方針
- 機能追加などは現時点で計画しない（基本機能の実装に集中）
- タスク実施時、前提を満たしていない場合は先に進まず相談する
- excalidrawの公式実装に準拠（ただしFirebaseは使用しない）

## コマンド一覧
```bash
# 開発環境起動
npm run dev

# テスト実行
npm test

# E2Eテスト実行
npm run test:e2e

# Lint実行
npm run lint

# 型チェック
npm run typecheck

# ビルド
npm run build

# Docker環境起動
docker-compose up -d

# Docker環境停止
docker-compose down
```

## ディレクトリ構造
```
excalidraw-board/
├── frontend/               # フロントエンドアプリケーション
│   ├── src/
│   ├── tests/
│   └── package.json
├── backend/               # バックエンド設定（Docker Compose）
│   └── docker-compose.yml
├── docs/
│   ├── develop/
│   │   ├── adr/          # アーキテクチャ決定記録
│   │   ├── tasks/        # タスクドキュメント
│   │   └── issue/        # 課題管理
│   └── investigation/    # 調査結果
│       └── sample/       # サンプル実装
├── playwright/           # E2Eテスト
└── CLAUDE.md            # このファイル
```

## 現在のステータス
- Phase 1: 基盤整備 (進行中)
  - [x] CLAUDE.md作成
  - [ ] ADR初期設定
  - [ ] 開発環境構築

## 次のステップ
1. ADRテンプレートの作成
2. 最初のADR（技術スタック選定）の作成
3. タスクドキュメントの作成