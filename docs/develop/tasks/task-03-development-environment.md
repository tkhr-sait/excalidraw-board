# タスク03: 開発環境構築

## 目的

excalidraw-boardプロジェクトの開発に必要な環境を構築し、チーム全員が同じ環境で開発できるようにする。

## 前提条件

- [ ] タスク02（アーキテクチャ設計）が完了していること
- [ ] Node.js（推奨バージョン）がインストール可能であること
- [ ] Dockerがインストール可能であること

## 構築項目

### 1. 基本環境のセットアップ

- [ ] Node.jsとnpmのインストール
- [ ] Dockerのインストールと設定
- [ ] Git設定（.gitignore、.gitattributes）
- [ ] エディタ設定（.editorconfig）

### 2. プロジェクト初期化

- [ ] プロジェクトディレクトリ構造の作成
- [ ] package.jsonの作成
- [ ] TypeScript設定（tsconfig.json）
- [ ] ESLint設定
- [ ] Prettier設定

### 3. 開発ツールの設定

- [ ] VSCode推奨拡張機能リストの作成
- [ ] デバッグ設定
- [ ] ホットリロード設定
- [ ] 環境変数管理（.env.example）

### 4. Docker環境の準備

- [ ] docker-compose.ymlの作成
- [ ] 開発用Dockerfileの作成（必要な場合）
- [ ] ボリュームマウント設定
- [ ] ネットワーク設定

## 成果物

- [ ] 環境構築手順書（docs/setup.md）
- [ ] 開発環境設定ファイル一式
- [ ] 環境構築スクリプト（setup.sh）
- [ ] トラブルシューティングガイド

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

- [ ] すべての開発ツールが正常に動作する
- [ ] Dockerコンテナが起動できる
- [ ] ホットリロードが機能する
- [ ] リンターとフォーマッターが動作する

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

- [ ] すべての構築項目が完了している
- [ ] 開発環境で基本的な動作確認ができる
- [ ] ドキュメントが整備されている
- [ ] 他の開発者が手順書に従って環境構築できる