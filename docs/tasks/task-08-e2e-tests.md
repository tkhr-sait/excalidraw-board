# Task 08: E2Eテストの実装（Playwright）

## 概要
Playwrightを使用して、アプリケーションのエンドツーエンドテストを実装する。ヘッドレスモードで実行し、コラボレーション機能を中心にテストする。

## 目的
- 基本描画機能のE2Eテスト
- コラボレーション機能のE2Eテスト
- ヘッドレスモードでの安定実行
- CI/CD統合

## 前提条件
- Task 01-07が完了していること
- Playwrightがインストールされていること
- Docker環境が動作していること

## 作業内容

### 1. Playwright設定
`frontend/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm docker:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 2. ページオブジェクトモデル
`frontend/tests/e2e/pages/excalidraw-page.ts`:
```typescript
import { Page, Locator, expect } from '@playwright/test';

export class ExcalidrawPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly toolbarRectangle: Locator;
  readonly toolbarCircle: Locator;
  readonly toolbarArrow: Locator;
  readonly toolbarText: Locator;
  readonly joinRoomButton: Locator;
  readonly leaveRoomButton: Locator;
  readonly connectionStatus: Locator;
  readonly collaboratorsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('canvas').first();
    this.toolbarRectangle = page.locator('[data-testid="toolbar-rectangle"]');
    this.toolbarCircle = page.locator('[data-testid="toolbar-ellipse"]');
    this.toolbarArrow = page.locator('[data-testid="toolbar-arrow"]');
    this.toolbarText = page.locator('[data-testid="toolbar-text"]');
    this.joinRoomButton = page.locator('button:has-text("Join Room")');
    this.leaveRoomButton = page.locator('button:has-text("Leave Room")');
    this.connectionStatus = page.locator('.connection-status');
    this.collaboratorsList = page.locator('.collaborators-list');
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad() {
    await expect(this.canvas).toBeVisible();
    // Welcomeスクリーンを閉じる
    try {
      const welcomeScreen = this.page.locator('.welcome-screen-center');
      if (await welcomeScreen.isVisible({ timeout: 2000 })) {
        await this.page.keyboard.press('Escape');
      }
    } catch {
      // Welcomeスクリーンがない場合は無視
    }
  }

  async selectTool(tool: 'rectangle' | 'circle' | 'arrow' | 'text') {
    const toolMap = {
      rectangle: this.toolbarRectangle,
      circle: this.toolbarCircle,
      arrow: this.toolbarArrow,
      text: this.toolbarText,
    };
    
    await toolMap[tool].click();
  }

  async drawRectangle(startX: number, startY: number, endX: number, endY: number) {
    await this.selectTool('rectangle');
    await this.canvas.click({ position: { x: startX, y: startY } });
    await this.canvas.click({ position: { x: endX, y: endY } });
  }

  async drawCircle(centerX: number, centerY: number, radius: number) {
    await this.selectTool('circle');
    await this.canvas.click({ position: { x: centerX - radius, y: centerY - radius } });
    await this.canvas.click({ position: { x: centerX + radius, y: centerY + radius } });
  }

  async addText(x: number, y: number, text: string) {
    await this.selectTool('text');
    await this.canvas.click({ position: { x, y } });
    await this.page.keyboard.type(text);
    await this.page.keyboard.press('Escape');
  }

  async joinRoom(roomId: string, username: string) {
    await this.joinRoomButton.click();
    await this.page.fill('input[placeholder*="room"]', roomId);
    await this.page.fill('input[placeholder*="name"]', username);
    await this.page.click('button:has-text("Join")');
    
    // 接続完了を待つ
    await expect(this.leaveRoomButton).toBeVisible({ timeout: 10000 });
  }

  async leaveRoom() {
    await this.leaveRoomButton.click();
    await expect(this.joinRoomButton).toBeVisible();
  }

  async waitForCollaborator(username: string) {
    await expect(
      this.collaboratorsList.locator(`text=${username}`)
    ).toBeVisible({ timeout: 10000 });
  }

  async isConnected(): Promise<boolean> {
    const status = await this.connectionStatus.textContent();
    return status?.includes('Connected') || false;
  }

  async getElementsCount(): Promise<number> {
    // Excalidrawの要素数を取得する方法
    // 実際の実装はExcalidrawのAPIに依存
    return await this.page.evaluate(() => {
      const excalidrawAPI = (window as any).excalidrawAPI;
      if (excalidrawAPI) {
        return excalidrawAPI.getSceneElements().length;
      }
      return 0;
    });
  }

  async saveScene() {
    await this.page.keyboard.press('Control+s');
  }

  async loadScene() {
    await this.page.keyboard.press('Control+o');
  }

  async undo() {
    await this.page.keyboard.press('Control+z');
  }

  async redo() {
    await this.page.keyboard.press('Control+y');
  }
}
```

### 3. 基本描画機能のテスト
`frontend/tests/e2e/drawing.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';

test.describe('Drawing Features', () => {
  let excalidrawPage: ExcalidrawPage;

  test.beforeEach(async ({ page }) => {
    excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
  });

  test('should load Excalidraw interface', async () => {
    await expect(excalidrawPage.canvas).toBeVisible();
    await expect(excalidrawPage.toolbarRectangle).toBeVisible();
    await expect(excalidrawPage.toolbarCircle).toBeVisible();
  });

  test('should draw a rectangle', async () => {
    const initialCount = await excalidrawPage.getElementsCount();
    
    await excalidrawPage.drawRectangle(100, 100, 200, 200);
    
    const finalCount = await excalidrawPage.getElementsCount();
    expect(finalCount).toBe(initialCount + 1);
  });

  test('should draw a circle', async () => {
    const initialCount = await excalidrawPage.getElementsCount();
    
    await excalidrawPage.drawCircle(150, 150, 50);
    
    const finalCount = await excalidrawPage.getElementsCount();
    expect(finalCount).toBe(initialCount + 1);
  });

  test('should add text', async () => {
    const initialCount = await excalidrawPage.getElementsCount();
    
    await excalidrawPage.addText(100, 100, 'Hello World');
    
    const finalCount = await excalidrawPage.getElementsCount();
    expect(finalCount).toBe(initialCount + 1);
  });

  test('should undo and redo operations', async () => {
    await excalidrawPage.drawRectangle(100, 100, 200, 200);
    const afterDrawCount = await excalidrawPage.getElementsCount();
    
    await excalidrawPage.undo();
    const afterUndoCount = await excalidrawPage.getElementsCount();
    expect(afterUndoCount).toBe(afterDrawCount - 1);
    
    await excalidrawPage.redo();
    const afterRedoCount = await excalidrawPage.getElementsCount();
    expect(afterRedoCount).toBe(afterDrawCount);
  });

  test('should persist drawings in localStorage when not collaborating', async () => {
    await excalidrawPage.drawRectangle(100, 100, 200, 200);
    
    // ページをリロード
    await excalidrawPage.page.reload();
    await excalidrawPage.waitForLoad();
    
    // 描画が復元されることを確認
    const elementsCount = await excalidrawPage.getElementsCount();
    expect(elementsCount).toBeGreaterThan(0);
  });
});
```

### 4. コラボレーション機能のテスト
`frontend/tests/e2e/collaboration.spec.ts`:
```typescript
import { test, expect, Page } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';

test.describe('Collaboration Features', () => {
  let page1: Page;
  let page2: Page;
  let excalidrawPage1: ExcalidrawPage;
  let excalidrawPage2: ExcalidrawPage;

  test.beforeEach(async ({ browser }) => {
    // 2つのブラウザコンテキストを作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    excalidrawPage1 = new ExcalidrawPage(page1);
    excalidrawPage2 = new ExcalidrawPage(page2);
    
    await excalidrawPage1.goto();
    await excalidrawPage2.goto();
  });

  test.afterEach(async () => {
    await page1.close();
    await page2.close();
  });

  test('should connect to the collaboration server', async () => {
    await expect(async () => {
      const connected1 = await excalidrawPage1.isConnected();
      const connected2 = await excalidrawPage2.isConnected();
      expect(connected1).toBe(true);
      expect(connected2).toBe(true);
    }).toPass({ timeout: 10000 });
  });

  test('should join the same room and see each other', async () => {
    const roomId = `test-room-${Date.now()}`;
    
    // 両方のユーザーが同じルームに参加
    await excalidrawPage1.joinRoom(roomId, 'User1');
    await excalidrawPage2.joinRoom(roomId, 'User2');
    
    // お互いの存在を確認
    await excalidrawPage1.waitForCollaborator('User2');
    await excalidrawPage2.waitForCollaborator('User1');
  });

  test('should sync drawings between users', async () => {
    const roomId = `test-room-${Date.now()}`;
    
    await excalidrawPage1.joinRoom(roomId, 'User1');
    await excalidrawPage2.joinRoom(roomId, 'User2');
    
    // User1が長方形を描画
    await excalidrawPage1.drawRectangle(100, 100, 200, 200);
    
    // User2の画面に同期されるまで待つ
    await expect(async () => {
      const count2 = await excalidrawPage2.getElementsCount();
      expect(count2).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });
  });

  test('should sync multiple drawings', async () => {
    const roomId = `test-room-${Date.now()}`;
    
    await excalidrawPage1.joinRoom(roomId, 'User1');
    await excalidrawPage2.joinRoom(roomId, 'User2');
    
    // User1が複数の要素を描画
    await excalidrawPage1.drawRectangle(50, 50, 100, 100);
    await excalidrawPage1.drawCircle(200, 200, 30);
    await excalidrawPage1.addText(150, 300, 'Hello');
    
    // User2でも追加
    await excalidrawPage2.drawRectangle(300, 50, 350, 100);
    
    // 両方に全ての要素が表示されることを確認
    await expect(async () => {
      const count1 = await excalidrawPage1.getElementsCount();
      const count2 = await excalidrawPage2.getElementsCount();
      expect(count1).toBe(4);
      expect(count2).toBe(4);
    }).toPass({ timeout: 10000 });
  });

  test('should handle user leaving the room', async () => {
    const roomId = `test-room-${Date.now()}`;
    
    await excalidrawPage1.joinRoom(roomId, 'User1');
    await excalidrawPage2.joinRoom(roomId, 'User2');
    
    // 両方が見えることを確認
    await excalidrawPage1.waitForCollaborator('User2');
    await excalidrawPage2.waitForCollaborator('User1');
    
    // User1がルームを退出
    await excalidrawPage1.leaveRoom();
    
    // User2のコラボレーターリストからUser1が消えることを確認
    await expect(
      excalidrawPage2.collaboratorsList.locator('text=User1')
    ).toBeHidden({ timeout: 5000 });
  });

  test('should not persist to localStorage during collaboration', async () => {
    const roomId = `test-room-${Date.now()}`;
    
    await excalidrawPage1.joinRoom(roomId, 'User1');
    await excalidrawPage1.drawRectangle(100, 100, 200, 200);
    
    // localStorageに保存されていないことを確認
    const storageData = await page1.evaluate(() => {
      return localStorage.getItem('excalidraw-board-scene');
    });
    
    expect(storageData).toBeNull();
  });
});
```

### 5. パフォーマンステスト
`frontend/tests/e2e/performance.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';

test.describe('Performance Tests', () => {
  let excalidrawPage: ExcalidrawPage;

  test.beforeEach(async ({ page }) => {
    excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await excalidrawPage.goto();
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5秒以内
  });

  test('should handle many elements without significant lag', async () => {
    const startTime = Date.now();
    
    // 50個の要素を描画
    for (let i = 0; i < 50; i++) {
      await excalidrawPage.drawRectangle(
        i * 10,
        i * 5,
        i * 10 + 20,
        i * 5 + 20
      );
    }
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000); // 30秒以内
    
    const finalCount = await excalidrawPage.getElementsCount();
    expect(finalCount).toBe(50);
  });

  test('should maintain responsiveness during collaboration', async ({ browser }) => {
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const excalidrawPage2 = new ExcalidrawPage(page2);
    await excalidrawPage2.goto();
    
    const roomId = `perf-test-${Date.now()}`;
    
    await excalidrawPage.joinRoom(roomId, 'User1');
    await excalidrawPage2.joinRoom(roomId, 'User2');
    
    const startTime = Date.now();
    
    // 両方のユーザーが同時に描画
    await Promise.all([
      excalidrawPage.drawRectangle(100, 100, 200, 200),
      excalidrawPage2.drawCircle(300, 300, 50),
    ]);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 5秒以内
    
    await page2.close();
  });
});
```

### 6. テスト用スクリプトとCI設定
`package.json`に追加:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

`.github/workflows/e2e.yml`:
```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: latest
    
    - name: Install dependencies
      run: |
        cd frontend
        pnpm install --frozen-lockfile
    
    - name: Install Playwright
      run: |
        cd frontend
        pnpm exec playwright install --with-deps
    
    - name: Build application
      run: |
        cd frontend
        pnpm build
    
    - name: Run E2E tests
      run: |
        cd frontend
        pnpm test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: frontend/playwright-report/
        retention-days: 30
```

### 7. テストユーティリティ
`frontend/tests/e2e/utils/test-helpers.ts`:
```typescript
import { Page } from '@playwright/test';

export async function generateRoomId(): Promise<string> {
  return `test-room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function waitForSocketConnection(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const socket = (window as any).socketService;
      return socket && socket.isConnected();
    },
    { timeout: 10000 }
  );
}

export async function clearBrowserData(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function takeScreenshotOnFailure(
  page: Page,
  testName: string
): Promise<void> {
  await page.screenshot({
    path: `test-results/failures/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}
```

## テスト要件

### 機能テスト
- [ ] 基本描画機能が動作する
- [ ] コラボレーション機能が動作する
- [ ] データの永続化が動作する
- [ ] エラーハンドリングが動作する

### パフォーマンステスト
- [ ] アプリケーションの起動時間
- [ ] 大量の要素でのパフォーマンス
- [ ] コラボレーション時の応答性

### ブラウザ互換性
- [ ] Chromeでの動作
- [ ] Firefoxでの動作
- [ ] Safariでの動作

## 成果物
1. 完全なE2Eテストスイート
2. ページオブジェクトモデル
3. パフォーマンステスト
4. CI/CD設定
5. テストユーティリティ

## 注意事項
- ヘッドレスモードでの安定実行を重視
- フレイキーテストを避けるための適切な待機
- テスト間の独立性を保つ
- パフォーマンスを考慮したテスト設計

## 次のタスク
Task 09: パフォーマンステストと最適化