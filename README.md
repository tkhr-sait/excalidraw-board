# excalidraw-board

- excalidraw-board は、Excalidraw ライブラリを使用したリアルタイムコラボレーション機能付きホワイトボードアプリケーションです。ローカルネットワーク内でセルフホスティング可能で、外部サービスに依存しません。

  - claude code で作ってみました。 → [📝 作成に利用したプロンプト](/docs/develop/prompt.md)

- 注意: excalidraw の realtime-collaboration 実装に準拠しているため、内部で[webcrypt](https://github.com/w3c/webcrypto/issues/28)を利用している。  
  これは https 環境もしくは localhost での http 環境 以外だと利用できない仕様..
  - ローカルネットワークでの利用を前提に、自己署名証明書での compose 起動を用意してある

## 動作イメージ

![](/docs/images/excalidraw-board.png)

## 使い方

```sh
# 前提: docker

git clone https://github.com/tkhr-sait/excalidraw-board.git
cd excalidraw-board/docker

# 開発環境で起動(localhostのみアクセス可能)
docker compose -f docker-compose.yml up
# http://localhost:3000 にアクセス

# ローカルネットワークで起動(自己署名でhttps。ローカルでの運用のみ想定)
cat << __EOF__ > .env
SERVER_HOST={IPアドレス}
SERVER_PORT={PORT}
__EOF__
# 最新のビルド済みイメージを使用できます
docker compose -f docker-compose.localnet.yml pull
docker compose -f docker-compose.localnet.yml up
https://${SERVER_HOST}:${SERVER_PORT}

# ローカルビルドを使用したい場合
# docker-compose.localnet.yml内のbuildセクションのコメントを解除し、
# imageセクションをコメントアウトしてください
```

# 以下 claude が作ったもの

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Excalidraw](https://img.shields.io/badge/Excalidraw-0.18.0-green.svg)](https://excalidraw.com/)

## 概要

excalidraw-board は、Excalidraw ライブラリを使用したリアルタイムコラボレーション機能付きホワイトボードアプリケーションです。ローカルネットワーク内でセルフホスティング可能で、外部サービスに依存しません。

### ✨ 主要機能

- **🎨 リアルタイムコラボレーション描画**

  - 複数ユーザーでの同時描画・編集
  - リアルタイムカーソル表示とユーザー識別
  - 要素の削除・復元の即座同期

- **🔗 簡単な共有機能**

  - URL 経由での直接ルーム参加
  - ワンクリックでの共有リンク生成
  - ユーザー名のリアルタイム同期

- **🔒 セルフホスティング**

  - 外部サービス依存なし
  - ローカルネットワーク内完結
  - プライベートデータの安全性

- **🚀 モダンな技術スタック**

  - React 19 + TypeScript 5.8
  - Vite 6.3 による高速ビルド
  - Excalidraw 0.18 公式ライブラリ
  - Socket.IO による安定通信

- **📱 優れた UX/UI**
  - レスポンシブデザイン
  - 直感的なインターフェース
  - モバイル・デスクトップ対応

## クイックスタート

### 🔧 必要な環境

- **Docker** 20.10 以上
- **Docker Compose** 2.0 以上
- **RAM** 4GB 以上推奨
- **ディスク容量** 10GB 以上
- **ポート** 3000, 3001, 3002 が利用可能であること

## 📖 ドキュメント

### 利用者向け

- [🚀 クイックスタートガイド](#-クイックスタート)
- [💡 使用方法と Tips](#-使用方法)

### 開発者向け

- [🏗️ アーキテクチャ設計](docs/adr/)
- [📋 開発タスク](docs/develop/tasks/)
- [🧪 テスト戦略](#-テスト)

## 💡 使用方法

### 基本的な使い方

1. ブラウザでアプリケーションにアクセス
2. 右上の「Share」ボタンをクリック
3. ルーム名とユーザー名を入力して参加
4. 共有リンクをコピーして他のユーザーを招待
5. リアルタイムで協働描画を開始

### URL 経由の直接参加

```
http://localhost:3000?room=my-room&username=alice
```

## 🧑‍💻 開発

### 開発環境のセットアップ

```bash
# フロントエンド開発
cd frontend
npm install
npm run dev          # 開発サーバー起動
npm run lint         # コード品質チェック
npm run format       # コードフォーマット
```

### 🧪 テスト

```bash
# ユニットテスト
npm run test              # 全テスト実行
npm run test:watch        # ウォッチモード
npm run test:coverage     # カバレッジ付き

# E2Eテスト
npm run test:e2e          # 全ブラウザでE2E
npm run test:e2e:ui       # Playwright UI
npm run test:e2e:debug    # デバッグモード

# 単体テスト実行例
npm run test:e2e -- --grep "collaboration" --project=chromium
```

### 📁 プロジェクト構造

```
excalidraw-board/
├── frontend/                    # React + TypeScript アプリ
│   ├── src/
│   │   ├── components/collab/   # コラボレーション機能
│   │   ├── hooks/              # カスタムフック
│   │   ├── services/           # Socket.IO, 同期処理
│   │   ├── types/              # TypeScript型定義
│   │   └── utils/              # ユーティリティ
│   ├── tests/                  # テストスイート
│   └── CLAUDE.md              # Claude Code 作業ガイド
├── docker/                     # Docker構成
├── scripts/                    # 運用スクリプト
├── docs/                       # 設計ドキュメント
└── samples/                    # 技術検証サンプル
```

## 🛠️ 技術スタック

### フロントエンド

- **React** 19.1.0 - モダン UI ライブラリ
- **TypeScript** 5.8.3 - 型安全な開発
- **Vite** 6.3.5 - 高速ビルドツール
- **Excalidraw** 0.18.0 - 描画エンジン
- **Socket.IO Client** 4.8.1 - リアルタイム通信

### バックエンド・インフラ

- **excalidraw-room** - 公式コラボレーションサーバー
- **Socket.IO** - WebSocket 通信基盤
- **Docker** + **Docker Compose** - コンテナ化
- **Nginx** - リバースプロキシ・Web サーバー

### 開発・テスト

- **Vitest** - 高速ユニットテスト
- **Playwright** - E2E テスト・ブラウザ自動化
- **ESLint** + **Prettier** - コード品質
- **TypeScript Strict** - 厳格な型チェック

### 特徴的な実装

- **リアルタイム同期**: Excalidraw 公式パターン採用
- **暗号化通信**: 決定論的ルームキー生成
- **要素同期**: 24 時間削除タイムアウト機能
- **URL 参加**: クエリパラメータでの直接ルーム参加

### 日常運用コマンド

```bash
# ログ確認
npm run logs:localnet

# サービス再起動
npm run restart:localnet

# サービス停止
npm run stop:localnet

```

## 🤝 コントリビューション

1. フォークしてブランチを作成
2. 機能追加・バグ修正を実装
3. テストを追加・実行
4. プルリクエストを作成

### 開発ガイドライン

- TypeScript Strict モードを使用
- 新機能にはテストを必須で追加
- ESLint + Prettier でコード品質を維持
- コミットメッセージは英語で簡潔に

## 📄 ライセンス

[MIT License](LICENSE) - 商用・非商用問わず自由に利用可能

## 🆘 サポート・お問い合わせ

- [🐛 Issue 報告](https://github.com/tkhr-sait/excalidraw-board/issues)
- [💬 ディスカッション](https://github.com/tkhr-sait/excalidraw-board/discussions)
- [📚 開発ドキュメント](docs/develop/)
