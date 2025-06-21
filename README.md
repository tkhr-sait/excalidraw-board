# excalidraw-board

## ⚠⚠⚠ 注意！現時点ではコラボレーション機能は動きません！ ⚠⚠⚠

claude code で作成した、セルフホスティング可能なリアルタイムコラボレーションホワイトボードアプリケーション

- [プロンプト](/docs/develop/prompt.md)
- [生成された計画](/docs/develop/plan.md)
- [実施したタスク](/docs/develop/tasks/)

![](/docs/images/excalidraw-board.png)

## 概要

excalidraw-board は、Excalidraw ライブラリを使用したリアルタイムコラボレーション機能付きホワイトボードアプリケーションです。ローカルネットワーク内でセルフホスティング可能で、外部サービスに依存しません。

### 主要機能

- ✨ リアルタイムコラボレーション描画
- 🔒 セルフホスティング（外部依存なし）
- 🚀 Docker による簡単デプロイ
- 🔧 ローカルネットワーク内での動作
- 📱 レスポンシブデザイン
- 🎨 豊富な描画ツール

## クイックスタート

### 必要な環境

- Docker 20.10+
- Docker Compose 2.0+
- 4GB 以上の RAM
- 10GB 以上のディスク容量

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/tkhr-sait/excalidraw-board.git
cd excalidraw-board

# 本番環境用デプロイ
./scripts/deploy.sh
```

アプリケーションは http://localhost でアクセスできます。

## ドキュメント

- [📖 インストールガイド](docs/installation.md)
- [⚙️ 運用マニュアル](docs/operations.md)
- [🔧 トラブルシューティング](docs/troubleshooting.md)
- [🔐 セキュリティガイド](docs/security.md)
- [📋 開発計画](docs/plan.md)

## 開発

### 開発環境のセットアップ

```bash
# 開発用の起動
docker-compose -f docker/docker-compose.yml up -d

# テストの実行
cd frontend
npm test
npm run test:e2e
```

### プロジェクト構造

```
excalidraw-board/
├── frontend/           # Reactフロントエンドアプリケーション
├── docker/            # Docker設定ファイル
├── scripts/           # デプロイ・運用スクリプト
├── docs/              # ドキュメント
└── samples/           # 技術検証用サンプル
```

## 技術スタック

- **フロントエンド**: React, TypeScript, Excalidraw
- **バックエンド**: excalidraw-room (公式)
- **通信**: Socket.IO (WebSocket)
- **コンテナ**: Docker, Docker Compose
- **Web サーバー**: Nginx
- **テスト**: Vitest, Playwright

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## サポート

- [Issue 報告](https://github.com/tkhr-sait/excalidraw-board/issues)
- [ディスカッション](https://github.com/tkhr-sait/excalidraw-board/discussions)
