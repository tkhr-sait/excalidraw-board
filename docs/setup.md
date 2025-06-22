# 開発環境セットアップガイド

## 前提条件

開発環境のセットアップには以下のツールが必要です：

- **Node.js** 18.0.0以上
- **npm** 9.0.0以上
- **Docker** 20.0.0以上
- **Docker Compose** 2.0.0以上
- **Git** (バージョン管理)

### インストール確認

```bash
node --version   # v18.0.0以上
npm --version    # 9.0.0以上
docker --version # 20.0.0以上
docker-compose --version # 2.0.0以上
```

## 自動セットアップ

最も簡単な方法は自動セットアップスクリプトを使用することです：

```bash
# リポジトリをクローン
git clone <repository-url>
cd excalidraw-board

# 自動セットアップを実行
npm run setup
```

セットアップスクリプトが以下を自動で行います：
- 前提条件のチェック
- 環境変数ファイルの作成
- 依存関係のインストール
- Dockerサービスの動作確認

## 手動セットアップ

### 1. 環境変数の設定

```bash
# 環境変数ファイルを作成
cp .env.example .env

# 必要に応じて.envファイルを編集
vim .env
```

### 2. 依存関係のインストール

```bash
# ルートディレクトリの依存関係
npm install

# フロントエンドの依存関係
cd frontend
npm install
cd ..
```

### 3. データディレクトリの作成

```bash
mkdir -p backend/data/rooms
mkdir -p backend/data/files
```

## 開発サーバーの起動

### すべてのサービスを同時起動

```bash
npm run dev
```

これにより以下が起動します：
- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3002

### 個別サービスの起動

```bash
# バックエンドのみ（excalidraw-room）
npm run dev:backend

# フロントエンドのみ（React + Vite）
npm run dev:frontend
```

## プロジェクト構造

```
excalidraw-board/
├── frontend/              # Reactフロントエンド
│   ├── src/              # ソースコード
│   │   ├── components/   # Reactコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── services/     # ビジネスロジック
│   │   ├── stores/       # Jotai状態管理
│   │   ├── types/        # TypeScript型定義
│   │   └── utils/        # ユーティリティ
│   ├── public/           # 静的ファイル
│   └── tests/            # ユニットテスト
├── backend/              # バックエンド設定
│   └── data/             # 永続化データ
├── tests/                # E2Eテスト
├── samples/              # サンプルコード
├── docs/                 # ドキュメント
└── scripts/              # セットアップスクリプト
```

## 利用可能なコマンド

### 開発コマンド

```bash
npm run dev              # 全サービス起動
npm run dev:frontend     # フロントエンドのみ
npm run dev:backend      # バックエンドのみ
```

### ビルドコマンド

```bash
npm run build            # プロダクションビルド
npm run build:frontend   # フロントエンドビルド
```

### テストコマンド

```bash
npm run test             # 全テスト実行
npm run test:unit        # ユニットテスト
npm run test:e2e         # E2Eテスト
```

### コード品質コマンド

```bash
npm run lint             # ESLint実行
npm run lint:fix         # ESLint自動修正
npm run typecheck        # TypeScript型チェック
```

### ユーティリティコマンド

```bash
npm run clean            # 依存関係をクリア
npm run setup            # 初回セットアップ
```

## 環境変数

主要な環境変数の説明：

```bash
# .env ファイル

# バックエンド設定
BACKEND_URL=http://localhost:3002

# フロントエンド設定
VITE_WEBSOCKET_URL=ws://localhost:3002
VITE_API_URL=http://localhost:3002
VITE_APP_TITLE=Excalidraw Board

# 開発環境設定
NODE_ENV=development

# Docker設定
FRONTEND_PORT=5173
BACKEND_PORT=3002
```

## VSCode設定

推奨拡張機能（自動でインストール推奨されます）：
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- TypeScript Importer
- Playwright Test for VSCode

## Docker設定

### Docker Composeサービス

```yaml
services:
  backend:    # excalidraw-room
  frontend:   # React開発サーバー（開発時）
```

### Docker操作

```bash
# サービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# サービス停止
docker-compose down

# 設定確認
docker-compose config
```

## トラブルシューティング

### よくある問題

#### 1. ポートが使用中

```bash
# ポート使用状況を確認
lsof -i :5173  # フロントエンド
lsof -i :3002  # バックエンド

# プロセスを終了
kill -9 <PID>
```

#### 2. Node.jsバージョンエラー

```bash
# Node.jsバージョン確認
node --version

# nvmでバージョン管理（推奨）
nvm install 18
nvm use 18
```

#### 3. Dockerエラー

```bash
# Docker状態確認
docker --version
docker-compose --version

# Dockerサービス確認
docker ps
docker-compose ps
```

#### 4. 依存関係エラー

```bash
# キャッシュクリア
npm cache clean --force

# node_modules削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 5. TypeScriptエラー

```bash
# 型チェック実行
npm run typecheck

# TypeScript設定確認
cat tsconfig.json
```

### エラーログ確認

```bash
# フロントエンドログ
cd frontend && npm run dev

# バックエンドログ
docker-compose logs backend

# すべてのログ
docker-compose logs -f
```

## ホットリロード確認

開発環境では以下の変更が自動で反映されます：
- ✅ React コンポーネント
- ✅ TypeScript ファイル
- ✅ CSS/Tailwind
- ✅ 環境変数（.env）

## パフォーマンス確認

開発サーバーが正常に動作していることを確認：

```bash
# フロントエンドヘルスチェック
curl http://localhost:5173

# バックエンドヘルスチェック
curl http://localhost:3002

# WebSocket接続テスト
cd samples/websocket-client
npm install
npm start
```

## 本番環境への展開

本番環境用の設定については `docs/deployment-guide.md` を参照してください。