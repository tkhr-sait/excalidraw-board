import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('Multi-User Collaboration Integration', () => {
  let browser1: Browser;
  let browser2: Browser | null = null;
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser }) => {
    // 2つの独立したブラウザインスタンスを作成
    browser1 = browser;
    try {
      browser2 = await browser.browserType().launch();
    } catch (error) {
      console.log('Failed to launch second browser, continuing with single browser test');
    }
  });

  test.beforeEach(async () => {
    if (!browser2) {
      test.skip('Second browser not available');
      return;
    }

    // 各ブラウザで新しいコンテキストとページを作成
    context1 = await browser1.newContext();
    context2 = await browser2.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // 両方のページでアプリケーションを開く
    await page1.goto('/');
    await page2.goto('/');
    
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    if (context1) await context1.close();
    if (context2) await context2.close();
  });

  test.afterAll(async () => {
    if (browser2) {
      await browser2.close();
    }
  });

  test('should load application in multiple browser instances', async () => {
    if (!browser2) return;

    // 両ユーザーのボードが表示されることを確認
    const canvas1 = page1.locator('canvas').first();
    const canvas2 = page2.locator('canvas').first();
    
    await expect(canvas1).toBeVisible();
    await expect(canvas2).toBeVisible();

    // 基本的な描画テスト（同期は検証しない）
    const rectangleButton1 = page1.locator('[aria-label="Rectangle"], [title*="Rectangle"], button').first();
    if (await rectangleButton1.isVisible()) {
      await rectangleButton1.click({ force: true });
      await page1.waitForTimeout(500);
      
      await page1.mouse.move(400, 300);
      await page1.mouse.down();
      await page1.mouse.move(500, 400);
      await page1.mouse.up();
    }

    // スクリーンショットを取得
    await page1.screenshot({ path: 'screenshots/integration-user1-draw.png' });
    await page2.screenshot({ path: 'screenshots/integration-user2-view.png' });

    // 両方のキャンバスが正常に動作していることを確認
    await expect(canvas1).toBeVisible();
    await expect(canvas2).toBeVisible();
  });

  test('should handle basic interactions in multiple instances', async () => {
    if (!browser2) return;

    // 基本的なインタラクションテスト
    await page1.mouse.move(500, 500);
    await page2.mouse.move(300, 300);
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);

    // 両方のページが正常に動作していることを確認
    const title1 = await page1.title();
    const title2 = await page2.title();
    
    expect(title1).toBeTruthy();
    expect(title2).toBeTruthy();
    
    // 最終スクリーンショット
    await page1.screenshot({ path: 'screenshots/integration-final-user1.png' });
    await page2.screenshot({ path: 'screenshots/integration-final-user2.png' });
  });
});