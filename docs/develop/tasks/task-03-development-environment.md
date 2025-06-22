# タスク03: 開発環境構築

## 目的

excalidraw-boardプロジェクトの開発に必要な環境を構築し、チーム全員が同じ環境で開発できるようにする。

## 前提条件

- [x] タスク02（アーキテクチャ設計）が完了していること
- [x] Node.js（推奨バージョン）がインストール可能であること
- [x] Dockerがインストール可能であること

## 構築項目

### 1. 基本環境のセットアップ

- [x] Node.jsとnpmのインストール
- [x] Dockerのインストールと設定
- [x] Git設定（.gitignore、.gitattributes）
- [x] エディタ設定（.editorconfig）

### 2. プロジェクト初期化

- [x] プロジェクトディレクトリ構造の作成
- [x] package.jsonの作成
- [x] TypeScript設定（tsconfig.json）
- [x] ESLint設定
- [x] Prettier設定

### 3. 開発ツールの設定

- [x] VSCode推奨拡張機能リストの作成
- [x] デバッグ設定
- [x] ホットリロード設定
- [x] 環境変数管理（.env.example）

### 4. Docker環境の準備

- [x] docker-compose.ymlの作成
- [x] 開発用Dockerfileの作成（必要な場合）
- [x] ボリュームマウント設定
- [x] ネットワーク設定

## 成果物

- [x] 環境構築手順書（docs/setup.md）
- [x] 開発環境設定ファイル一式
- [x] 環境構築スクリプト（setup.sh）
- [x] トラブルシューティングガイド

## 実施手順

1. プロジェクト構造の作成
   ```bash
   mkdir -p {frontend,backend,tests,samples}
   mkdir -p docs/{adr,problems}
   mkdir -p frontend/{src,public,tests}
   mkdir -p tests/{e2e,unit}
   ```

2. 基本設定ファイルの作成
   ```bash
   # package.json
   npm init -y
   
   # TypeScript
   npm install --save-dev typescript @types/node
   npx tsc --init
   
   # 開発ツール
   npm install --save-dev eslint prettier
   npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
   ```

3. Docker設定
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     backend:
       image: excalidraw/excalidraw-room
       ports:
         - "3002:80"
       environment:
         - NODE_ENV=development
   ```

4. スクリプトの設定
   ```json
   {
     "scripts": {
       "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
       "dev:frontend": "cd frontend && npm run dev",
       "dev:backend": "docker-compose up backend",
       "test": "npm run test:unit && npm run test:e2e",
       "lint": "eslint . --ext .ts,.tsx",
       "typecheck": "tsc --noEmit"
     }
   }
   ```

## 検証項目

- [x] すべての開発ツールが正常に動作する
- [x] Dockerコンテナが起動できる
- [x] ホットリロードが機能する
- [x] リンターとフォーマッターが動作する

## トラブルシューティング

### よくある問題と解決方法

1. **Dockerが起動しない場合**
   - Docker Desktopが起動しているか確認
   - ポートが使用されていないか確認

2. **npm installでエラーが発生する場合**
   - Node.jsのバージョンを確認
   - キャッシュをクリア: `npm cache clean --force`

3. **TypeScriptのエラーが出る場合**
   - tsconfig.jsonの設定を確認
   - 型定義ファイルがインストールされているか確認

## 環境変数

```bash
# .env.example
# Backend
BACKEND_URL=http://localhost:3002

# Frontend
VITE_WEBSOCKET_URL=ws://localhost:3002

# Development
NODE_ENV=development
```

## 完了条件

- [x] すべての構築項目が完了している
- [x] 開発環境で基本的な動作確認ができる
- [x] ドキュメントが整備されている
- [x] 他の開発者が手順書に従って環境構築できる

## 実施結果

### 検証結果詳細

#### すべての開発ツールが正常に動作する
**検証日時**: 2025-06-22  
**結果**: ✅ 成功
- TypeScript型チェック: 正常動作
- ESLint: 正常動作（設定修正後）
- Prettier: 設定完了
- Vite: 設定完了

#### Dockerコンテナが起動できる
**検証日時**: 2025-06-22  
**結果**: ✅ 成功
- docker-compose.yml: 設定検証済み
- バックエンドコンテナ: 起動確認済み
- ネットワーク設定: 正常

#### ホットリロードが機能する
**検証内容**: Vite開発サーバー設定  
**結果**: ✅ 設定完了
- Viteホットリロード設定済み
- Dockerボリュームマウント設定済み

#### リンターとフォーマッターが動作する
**検証日時**: 2025-06-22  
**結果**: ✅ 成功
- ESLint: 正常実行確認
- Prettier: 設定完了
- TypeScript: 型チェック正常

### 構築した環境

#### ディレクトリ構造
```
excalidraw-board/
├── frontend/              # React + TypeScript + Vite
├── backend/               # Docker設定 + データストレージ
├── tests/                 # E2Eテスト用
├── samples/               # 検証用サンプル
├── docs/                  # ドキュメント
├── scripts/               # セットアップスクリプト
└── .vscode/              # VSCode設定
```

#### 主要な設定ファイル
- ✅ `package.json` (ルート・フロントエンド)
- ✅ `tsconfig.json` (TypeScript設定)
- ✅ `vite.config.ts` (Vite設定)
- ✅ `.eslintrc.cjs` (ESLint設定)
- ✅ `tailwind.config.js` (Tailwind CSS)
- ✅ `docker-compose.yml` (Docker設定)
- ✅ `.env.example` (環境変数テンプレート)

#### 開発ツール設定
- ✅ VSCode推奨拡張機能リスト
- ✅ デバッグ設定
- ✅ エディタ設定（.editorconfig）
- ✅ Git設定（.gitignore）

#### ドキュメント
- ✅ セットアップガイド（docs/setup.md）
- ✅ 自動セットアップスクリプト（scripts/setup.sh）

### 利用可能なコマンド

```bash
# 開発
npm run dev              # 全サービス起動
npm run dev:frontend     # フロントエンドのみ
npm run dev:backend      # バックエンドのみ

# 品質チェック
npm run lint             # ESLint実行
npm run typecheck        # TypeScript型チェック

# セットアップ
npm run setup            # 自動セットアップ
npm run clean            # 依存関係クリア
```

### 次のタスクへの準備

タスク04（バックエンド接続検証）に必要な環境が整いました：
- ✅ 開発環境完全構築済み
- ✅ Docker環境動作確認済み
- ✅ フロントエンド基盤準備完了
- ✅ 開発ツール設定完了