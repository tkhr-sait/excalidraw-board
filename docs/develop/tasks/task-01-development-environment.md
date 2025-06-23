# Task 01: 開発環境構築

## 概要
excalidraw-boardプロジェクトの開発環境を構築する。

## 前提条件
- Node.js 18以上がインストールされていること
- Dockerがインストールされていること
- npmが利用可能であること

## 作業内容

### 1. プロジェクト構造の作成
```bash
mkdir -p frontend backend playwright
mkdir -p docs/investigation/sample
```

### 2. フロントエンドプロジェクトの初期化
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install @excalidraw/excalidraw
npm install -D @types/react @types/react-dom
```

### 3. バックエンド（Docker Compose）の設定
```yaml
# backend/docker-compose.yml
version: '3.8'

services:
  excalidraw-room:
    image: excalidraw/excalidraw-room:latest
    ports:
      - "3002:80"
    environment:
      - PORT=80
    restart: unless-stopped
```

### 4. 開発用スクリプトの追加
frontendのpackage.jsonに以下を追加：
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview"
  }
}
```

### 5. ESLint設定
```bash
cd frontend
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D eslint-plugin-react eslint-plugin-react-hooks
```

### 6. Playwrightの設定
```bash
cd ../playwright
npm init -y
npm install -D @playwright/test
npx playwright install
```

## 検証項目
- [ ] `cd frontend && npm run dev` でフロントエンドが起動すること
- [ ] `cd backend && docker-compose up` でexcalidraw-roomが起動すること
- [ ] `http://localhost:5173` でフロントエンドにアクセスできること
- [ ] `http://localhost:3002` でexcalidraw-roomにアクセスできること
- [ ] TypeScriptの型チェックが正常に動作すること

## 成果物
- frontend/package.json
- frontend/tsconfig.json
- frontend/vite.config.ts
- backend/docker-compose.yml
- playwright/package.json

## 次のステップ
Task 02: 基本的なExcalidrawコンポーネントの実装