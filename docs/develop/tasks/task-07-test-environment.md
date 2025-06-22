# タスク07: テスト環境構築

## 目的

Playwrightを使用したE2Eテスト環境を構築し、ヘッドレスモードでの自動テストを可能にする。

## 前提条件

- [ ] タスク03（開発環境構築）が完了していること
- [ ] フロントエンドアプリケーションが起動可能であること
- [ ] バックエンド（excalidraw-room）が起動可能であること

## 構築項目

### 1. Playwrightのセットアップ

- [x] Playwrightのインストール
- [x] 設定ファイルの作成
- [x] ブラウザのインストール
- [x] ヘッドレスモードの設定

### 2. テスト基盤の構築

- [x] テストヘルパーの作成
- [x] ページオブジェクトモデルの実装
- [x] 共通ユーティリティの作成
- [x] テストデータの管理

### 3. CI/CD対応

- [x] GitHub Actions設定（将来用）
- [x] Dockerでのテスト実行
- [x] テストレポートの生成
- [x] スクリーンショット/動画の保存

### 4. モックサーバーの準備

- [x] WebSocketモックの実装
- [x] テスト用データの準備
- [x] 環境切り替えの仕組み

## 成果物

- [x] Playwright設定（playwright.config.ts）
- [x] テストヘルパー（tests/e2e/helpers/）
- [x] ページオブジェクト（tests/e2e/pages/）
- [x] テスト実行ガイド（docs/testing-guide.md）

## 実施手順

1. Playwrightのインストール
   ```bash
   # Playwrightのインストール
   npm install --save-dev @playwright/test
   
   # ブラウザのインストール
   npx playwright install
   
   # 依存関係のインストール（Linux環境）
   npx playwright install-deps
   ```

2. 設定ファイルの作成
   ```typescript
   // playwright.config.ts
   import { defineConfig, devices } from '@playwright/test';
   
   export default defineConfig({
     testDir: './tests/e2e',
     fullyParallel: true,
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: process.env.CI ? 1 : undefined,
     reporter: 'html',
     
     use: {
       baseURL: 'http://localhost:5173',
       trace: 'on-first-retry',
       screenshot: 'only-on-failure',
       video: 'retain-on-failure',
       headless: true, // ヘッドレスモード
     },
     
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       },
       {
         name: 'firefox',
         use: { ...devices['Desktop Firefox'] },
       },
     ],
     
     webServer: [
       {
         command: 'npm run dev:frontend',
         port: 5173,
         reuseExistingServer: !process.env.CI,
       },
       {
         command: 'docker-compose up backend',
         port: 3002,
         reuseExistingServer: !process.env.CI,
       },
     ],
   });
   ```

3. ページオブジェクトの実装
   ```typescript
   // tests/e2e/pages/BoardPage.ts
   import { Page, Locator } from '@playwright/test';
   
   export class BoardPage {
     readonly page: Page;
     readonly canvas: Locator;
     readonly toolbar: Locator;
     
     constructor(page: Page) {
       this.page = page;
       this.canvas = page.locator('canvas');
       this.toolbar = page.locator('[role="toolbar"]');
     }
     
     async goto(roomId?: string) {
       const url = roomId ? `/room/${roomId}` : '/';
       await this.page.goto(url);
       await this.page.waitForLoadState('networkidle');
     }
     
     async drawRectangle(x: number, y: number, width: number, height: number) {
       await this.toolbar.locator('[data-tool="rectangle"]').click();
       await this.canvas.click({ position: { x, y } });
       await this.page.mouse.move(x + width, y + height);
       await this.page.mouse.up();
     }
   }
   ```

4. テストヘルパーの作成
   ```typescript
   // tests/e2e/helpers/collaboration.ts
   import { Browser, BrowserContext, Page } from '@playwright/test';
   
   export class CollaborationHelper {
     static async createCollaborationSession(
       browser: Browser,
       roomId: string,
       userCount: number
     ): Promise<{ contexts: BrowserContext[], pages: Page[] }> {
       const contexts: BrowserContext[] = [];
       const pages: Page[] = [];
       
       for (let i = 0; i < userCount; i++) {
         const context = await browser.newContext();
         const page = await context.newPage();
         await page.goto(`/room/${roomId}`);
         
         contexts.push(context);
         pages.push(page);
       }
       
       return { contexts, pages };
     }
   }
   ```

## テストシナリオ

### 基本テスト
1. アプリケーションの起動確認
2. Excalidrawコンポーネントの表示確認
3. 基本的な描画操作

### コラボレーションテスト
1. 複数ユーザーの同時接続
2. リアルタイム同期の確認
3. 切断・再接続のテスト

### パフォーマンステスト
1. 大量の図形での動作確認
2. 多数ユーザーでの負荷テスト

## スクリプト設定

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:report": "playwright show-report"
  }
}
```

## Docker環境でのテスト

```dockerfile
# Dockerfile.test
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "test:e2e"]
```

## トラブルシューティング

1. **ブラウザが起動しない**
   - 依存関係の確認: `npx playwright install-deps`
   - 権限の確認

2. **タイムアウトエラー**
   - `waitForLoadState`の調整
   - タイムアウト値の増加

3. **要素が見つからない**
   - セレクタの確認
   - 待機処理の追加

## 完了条件

- [x] Playwrightが正常にインストールされている
- [x] ヘッドレスモードでテストが実行できる
- [x] 基本的なE2Eテストが作成されている
- [x] テストレポートが生成される
- [x] CI/CD環境での実行準備ができている