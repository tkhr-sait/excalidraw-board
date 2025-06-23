# Task 05: E2Eテストの実装

## 概要
Playwrightを使用して、リアルタイムコラボレーション機能のE2Eテストを実装する。

## 前提条件
- Task 04（コラボレーション機能）が完了していること
- Playwrightがインストールされていること
- フロントエンドとバックエンドが起動可能であること

## 作業内容

### 1. Playwright設定ファイルの作成
```typescript
// playwright/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on',
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
  ],

  webServer: [
    {
      command: 'cd ../frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../backend && docker-compose up',
      port: 3002,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### 2. 基本的な描画テスト
```typescript
// playwright/tests/basic-drawing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Basic Drawing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="excalidraw-board"]');
  });

  test('should load Excalidraw board', async ({ page }) => {
    const board = page.locator('[data-testid="excalidraw-board"]');
    await expect(board).toBeVisible();
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'screenshots/initial-board.png' });
  });

  test('should draw a rectangle', async ({ page }) => {
    // 矩形ツールを選択
    await page.click('[aria-label="Rectangle"]');
    
    // 描画エリアで矩形を描く
    const canvas = page.locator('canvas').first();
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 300, y: 200 },
    });

    // 要素が作成されたことを確認
    await expect(page.locator('.excalidraw-element')).toHaveCount(1);
    
    await page.screenshot({ path: 'screenshots/rectangle-drawn.png' });
  });

  test('should draw multiple shapes', async ({ page }) => {
    // 矩形を描く
    await page.click('[aria-label="Rectangle"]');
    const canvas = page.locator('canvas').first();
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 200 },
    });

    // 円を描く
    await page.click('[aria-label="Ellipse"]');
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 300, y: 100 },
      targetPosition: { x: 400, y: 200 },
    });

    // 線を描く
    await page.click('[aria-label="Line"]');
    await canvas.click({ position: { x: 250, y: 250 } });
    await canvas.click({ position: { x: 350, y: 350 } });

    await page.screenshot({ path: 'screenshots/multiple-shapes.png' });
  });
});
```

### 3. コラボレーションテスト
```typescript
// playwright/tests/collaboration.spec.ts
import { test, expect, Page, Browser } from '@playwright/test';

test.describe('Collaboration Features', () => {
  let browser1: Browser;
  let browser2: Browser;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser }) => {
    // 2つのブラウザインスタンスを起動
    browser1 = browser;
    browser2 = await browser.browserType().launch();
  });

  test.beforeEach(async () => {
    // 2つのページを作成
    page1 = await browser1.newPage();
    page2 = await browser2.newPage();

    // 同じURLにアクセス
    await page1.goto('/');
    await page2.goto('/');

    await page1.waitForSelector('[data-testid="excalidraw-board"]');
    await page2.waitForSelector('[data-testid="excalidraw-board"]');
  });

  test.afterEach(async () => {
    await page1.close();
    await page2.close();
  });

  test.afterAll(async () => {
    await browser2.close();
  });

  test('should enable collaboration', async () => {
    // ユーザー1でコラボレーションを有効化
    const collabButton1 = page1.locator('[aria-label="Live collaboration"]');
    await collabButton1.click();

    // 接続状態を確認
    await expect(page1.locator('text=接続中')).toBeVisible();

    // スクリーンショットを保存
    await page1.screenshot({ path: 'screenshots/collaboration-enabled.png' });
  });

  test('should sync drawing between users', async () => {
    // 両方のユーザーでコラボレーションを有効化
    await page1.locator('[aria-label="Live collaboration"]').click();
    await page2.locator('[aria-label="Live collaboration"]').click();

    // 接続を待つ
    await expect(page1.locator('text=接続中')).toBeVisible();
    await expect(page2.locator('text=接続中')).toBeVisible();

    // ユーザー1で矩形を描く
    await page1.click('[aria-label="Rectangle"]');
    const canvas1 = page1.locator('canvas').first();
    await canvas1.dragTo(canvas1, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 200 },
    });

    // ユーザー2に同期されるのを待つ
    await page2.waitForTimeout(1000);

    // 両方のページでスクリーンショットを取得
    await page1.screenshot({ path: 'screenshots/collab-user1.png' });
    await page2.screenshot({ path: 'screenshots/collab-user2.png' });

    // ユーザー2でも要素が表示されることを確認
    const elements2 = await page2.locator('.excalidraw-element').count();
    expect(elements2).toBeGreaterThan(0);
  });

  test('should show remote cursor', async () => {
    // コラボレーションを有効化
    await page1.locator('[aria-label="Live collaboration"]').click();
    await page2.locator('[aria-label="Live collaboration"]').click();

    await expect(page1.locator('text=接続中')).toBeVisible();
    await expect(page2.locator('text=接続中')).toBeVisible();

    // ユーザー1でマウスを動かす
    const canvas1 = page1.locator('canvas').first();
    await canvas1.hover({ position: { x: 250, y: 250 } });

    // ユーザー2でリモートカーソルが表示されることを確認
    await page2.waitForTimeout(500);
    const remoteCursor = page2.locator('.remote-cursor');
    await expect(remoteCursor).toBeVisible();

    await page2.screenshot({ path: 'screenshots/remote-cursor.png' });
  });
});
```

### 4. パフォーマンステスト
```typescript
// playwright/tests/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should handle multiple shapes efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="excalidraw-board"]');

    const startTime = Date.now();
    
    // 50個の図形を描く
    for (let i = 0; i < 50; i++) {
      await page.click('[aria-label="Rectangle"]');
      const canvas = page.locator('canvas').first();
      
      const x = 50 + (i % 10) * 80;
      const y = 50 + Math.floor(i / 10) * 80;
      
      await canvas.dragTo(canvas, {
        sourcePosition: { x, y },
        targetPosition: { x: x + 60, y: y + 60 },
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 50個の図形描画が30秒以内に完了すること
    expect(duration).toBeLessThan(30000);

    await page.screenshot({ path: 'screenshots/performance-test.png' });
  });

  test('should handle rapid collaboration updates', async ({ page, browser }) => {
    const page2 = await browser.newPage();
    
    await page.goto('/');
    await page2.goto('/');
    
    // コラボレーションを有効化
    await page.locator('[aria-label="Live collaboration"]').click();
    await page2.locator('[aria-label="Live collaboration"]').click();

    await expect(page.locator('text=接続中')).toBeVisible();
    await expect(page2.locator('text=接続中')).toBeVisible();

    // 複数の図形を素早く描く
    const canvas1 = page.locator('canvas').first();
    
    for (let i = 0; i < 10; i++) {
      await page.click('[aria-label="Rectangle"]');
      await canvas1.dragTo(canvas1, {
        sourcePosition: { x: 100 + i * 20, y: 100 },
        targetPosition: { x: 150 + i * 20, y: 150 },
      });
    }

    // 同期を待つ
    await page2.waitForTimeout(2000);

    // 両方のページで同じ数の要素が存在することを確認
    const elements1 = await page.locator('.excalidraw-element').count();
    const elements2 = await page2.locator('.excalidraw-element').count();
    
    expect(elements1).toBe(elements2);

    await page2.close();
  });
});
```

### 5. テストヘルパー関数
```typescript
// playwright/tests/helpers/test-utils.ts
import { Page } from '@playwright/test';

export async function enableCollaboration(page: Page): Promise<void> {
  await page.locator('[aria-label="Live collaboration"]').click();
  await page.waitForSelector('text=接続中');
}

export async function drawRectangle(
  page: Page, 
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number
): Promise<void> {
  await page.click('[aria-label="Rectangle"]');
  const canvas = page.locator('canvas').first();
  await canvas.dragTo(canvas, {
    sourcePosition: { x: x1, y: y1 },
    targetPosition: { x: x2, y: y2 },
  });
}

export async function waitForSync(page: Page, timeout = 1000): Promise<void> {
  await page.waitForTimeout(timeout);
}

export async function getElementCount(page: Page): Promise<number> {
  return await page.locator('.excalidraw-element').count();
}
```

### 6. テスト実行スクリプト
```json
// playwright/package.json に追加
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:report": "playwright show-report",
    "test:codegen": "playwright codegen http://localhost:5173"
  }
}
```

## 検証項目
- [ ] 基本的な描画テストが通ること
- [ ] コラボレーションテストが通ること
- [ ] パフォーマンステストが通ること
- [ ] スクリーンショットが正しく保存されること
- [ ] テストレポートが生成されること

## 成果物
- playwright/playwright.config.ts
- playwright/tests/basic-drawing.spec.ts
- playwright/tests/collaboration.spec.ts
- playwright/tests/performance.spec.ts
- playwright/tests/helpers/test-utils.ts
- playwright/screenshots/ (テスト実行時に生成)

## 次のステップ
Task 06: ビルドとデプロイ設定