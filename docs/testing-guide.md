# E2Eテスト実行ガイド

## 概要

このプロジェクトではPlaywrightを使用したE2Eテスト環境を構築しています。ヘッドレスモードでの自動テストが可能で、複数ブラウザでのクロスブラウザテストとリアルタイムコラボレーションのテストを実行できます。

## 前提条件

### 必要なソフトウェア
- Node.js 18以上
- Docker（バックエンド用）
- Git

### 環境準備
1. **バックエンドの起動**
   ```bash
   # excalidraw-roomコンテナの起動
   docker start excalidraw-room
   
   # または新規起動
   docker run -d --name excalidraw-room -p 3002:80 excalidraw/excalidraw-room:latest
   ```

2. **依存関係のインストール**
   ```bash
   cd frontend
   npm install
   ```

3. **Playwrightブラウザのインストール**
   ```bash
   npx playwright install
   ```

## テスト実行方法

### 基本的なテスト実行

```bash
# すべてのE2Eテストを実行（ヘッドレスモード）
npm run test:e2e

# 特定のテストファイルを実行
npm run test:e2e tests/e2e/basic.spec.ts

# 特定のブラウザでテストを実行
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
```

### デバッグモード

```bash
# ブラウザを表示してテストを実行
npm run test:e2e:headed

# インタラクティブUIでテストを実行
npm run test:e2e:ui

# デバッグモードでテストを実行
npm run test:e2e:debug
```

### テストレポート

```bash
# テストレポートを表示
npm run test:e2e:report
```

## テスト構成

### ディレクトリ構造
```
frontend/tests/e2e/
├── pages/                 # Page Object Model
│   ├── WelcomePage.ts    # ウェルカムページ
│   └── BoardPage.ts      # ボードページ
├── helpers/              # テストヘルパー
│   ├── collaboration.ts # コラボレーション用ヘルパー
│   └── test-data.ts     # テストデータとユーティリティ
├── basic.spec.ts         # 基本機能テスト
├── collaboration.spec.ts # コラボレーションテスト
├── global-setup.ts      # グローバルセットアップ
└── global-teardown.ts   # グローバルティアダウン
```

### テストカテゴリ

#### 1. 基本機能テスト（basic.spec.ts）
- ウェルカムページの表示
- 新規ルーム作成
- 既存ルーム参加
- ボードページの読み込み
- WebSocket接続
- ヘッダー情報表示

#### 2. コラボレーションテスト（collaboration.spec.ts）
- 複数ユーザーの同時接続
- リアルタイム描画同期
- ユーザー切断・再接続
- 多人数での同時作業
- セッション維持

## テスト設定

### Playwright設定（playwright.config.ts）

```typescript
// 主要設定項目
{
  testDir: './tests/e2e',
  fullyParallel: true,          // 並列実行
  retries: process.env.CI ? 2 : 0,  // CI環境でのリトライ
  workers: process.env.CI ? 1 : undefined,  // CI環境でのワーカー数
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,             // ヘッドレスモード
    screenshot: 'only-on-failure',  // 失敗時スクリーンショット
    video: 'retain-on-failure', // 失敗時動画記録
    trace: 'on-first-retry',    // リトライ時トレース
  }
}
```

### サポートブラウザ
- Chromium（Desktop Chrome）
- Firefox（Desktop Firefox）
- WebKit（Desktop Safari）
- Mobile Chrome（Pixel 5）

## トラブルシューティング

### よくある問題

#### 1. バックエンドが起動していない
```
Error: Backend server is required for E2E tests
```

**解決方法:**
```bash
# Dockerコンテナの状態確認
docker ps -a | grep excalidraw-room

# コンテナの起動
docker start excalidraw-room

# 新規作成（必要に応じて）
docker run -d --name excalidraw-room -p 3002:80 excalidraw/excalidraw-room:latest
```

#### 2. フロントエンドが起動していない
```
Error: connect ECONNREFUSED 127.0.0.1:5173
```

**解決方法:**
- Playwrightが自動的にフロントエンドを起動します
- 手動で起動する場合: `npm run dev`

#### 3. ブラウザが見つからない
```
Error: Executable doesn't exist at /path/to/browser
```

**解決方法:**
```bash
# ブラウザの再インストール
npx playwright install

# システム依存関係のインストール（Linux）
npx playwright install-deps
```

#### 4. テストタイムアウト
```
Error: Test timeout of 30000ms exceeded
```

**解決方法:**
- ネットワーク環境を確認
- バックエンドの動作を確認
- テストタイムアウトを調整

#### 5. 要素が見つからない
```
Error: waiting for selector "[data-testid='toolbar-rectangle']" to be visible
```

**解決方法:**
- Excalidrawの読み込み完了を待機
- セレクタの確認
- デバッグモードでの実行

### デバッグのヒント

1. **ブラウザを表示して実行**
   ```bash
   npm run test:e2e:headed
   ```

2. **スクリーンショットの確認**
   - `test-results/` ディレクトリを確認
   - 失敗時のスクリーンショットと動画を確認

3. **ログの確認**
   - ブラウザコンソールログ
   - ネットワークタブ
   - Playwrightのトレース

4. **インタラクティブモード**
   ```bash
   npm run test:e2e:ui
   ```

## CI/CD環境での実行

### GitHub Actions（将来実装予定）
```yaml
- name: Run E2E tests
  run: |
    # Start backend
    docker run -d --name excalidraw-room -p 3002:80 excalidraw/excalidraw-room:latest
    # Install dependencies
    npm ci
    npx playwright install --with-deps
    # Run tests
    npm run test:e2e
```

### Docker環境
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "test:e2e"]
```

## パフォーマンス考慮事項

### テスト実行時間の最適化
- 並列実行の活用
- 不要な待機時間の削減
- テストデータの効率的な管理

### リソース使用量
- ヘッドレスモードの使用
- 適切なワーカー数の設定
- メモリ使用量の監視

## テスト拡張

### 新しいテストの追加
1. Page Objectの作成または拡張
2. テストヘルパーの実装
3. テストケースの実装
4. テストデータの準備

### カスタムヘルパーの作成
```typescript
// helpers/custom-helper.ts
export class CustomHelper {
  static async customAction(page: Page) {
    // カスタムアクション
  }
}
```

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Excalidraw GitHub](https://github.com/excalidraw/excalidraw)
- [プロジェクトREADME](../README.md)
- [アーキテクチャ設計書](./adr/)