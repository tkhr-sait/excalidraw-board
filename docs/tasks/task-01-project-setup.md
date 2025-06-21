# Task 01: プロジェクト初期設定とビルド環境構築

## 概要
excalidraw-boardプロジェクトの基本的な開発環境を構築し、フロントエンドアプリケーションの土台を作成する。

## 目的
- Node.jsプロジェクトの初期設定
- TypeScript + React環境の構築
- 開発ツールチェーンの設定
- 基本的なプロジェクト構造の確立

## 前提条件
- Node.js 18+ がインストールされていること
- pnpmがインストールされていること
- Dockerがインストールされていること

## 作業内容

### 1. プロジェクトルートの設定
```bash
# package.jsonの作成
pnpm init

# .gitignoreの作成
# .editorconfig の作成
# README.mdの更新
```

### 2. フロントエンドプロジェクトの初期化
```bash
# frontendディレクトリの作成
mkdir frontend
cd frontend

# Vite + React + TypeScriptプロジェクトの作成
pnpm create vite . --template react-ts

# 依存関係のインストール
pnpm install
```

### 3. 必要な依存関係の追加
```bash
cd frontend

# Excalidraw関連
pnpm add @excalidraw/excalidraw

# Socket.IO Client
pnpm add socket.io-client

# 開発用依存関係
pnpm add -D @types/node
pnpm add -D @testing-library/react @testing-library/jest-dom
pnpm add -D vitest @vitest/ui
pnpm add -D @playwright/test
```

### 4. TypeScript設定
- `tsconfig.json`の調整
  - strictモードの有効化
  - パスエイリアスの設定
  - JSX設定

### 5. Vite設定
- `vite.config.ts`の設定
  - ポート設定（開発サーバー: 3000）
  - プロキシ設定（WebSocket用）
  - ビルド最適化設定

### 6. ESLint/Prettier設定
```bash
# ESLint設定
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks

# Prettier設定
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
```

### 7. 基本的なディレクトリ構造の作成
```
frontend/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── tests/
│   ├── unit/
│   └── e2e/
└── ...
```

### 8. package.json スクリプトの設定
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  }
}
```

## テスト要件

### ユニットテスト
1. プロジェクトが正しく初期化されること
2. 開発サーバーが起動すること
3. ビルドが成功すること

### 検証項目
- [ ] `pnpm dev`で開発サーバーが起動する
- [ ] `pnpm build`でビルドが成功する
- [ ] `pnpm test`でテストが実行される
- [ ] `pnpm lint`でリントが実行される

## 成果物
1. 設定済みのfrontendディレクトリ
2. package.json（依存関係定義済み）
3. TypeScript/Vite/ESLint設定ファイル
4. 基本的なディレクトリ構造

## 注意事項
- excalidraw公式リポジトリの`package.json`を参考にバージョンを合わせる
- 不要な依存関係は追加しない
- 開発環境はローカルネットワークでの動作を前提とする

## 次のタスク
Task 02: Docker環境のセットアップ