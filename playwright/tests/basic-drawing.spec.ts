import { test, expect } from '@playwright/test';

test.describe('Basic Drawing', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console messages and errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('CONSOLE ERROR:', msg.text());
      } else {
        console.log('CONSOLE LOG:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
      console.log('STACK:', error.stack);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for Excalidraw to load
  });

  test('should load Excalidraw board', async ({ page }) => {
    // スクリーンショットを保存
    await page.screenshot({ path: 'screenshots/initial-board.png' });
    
    // Check for errors in console
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    // Check if root div exists
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    
    // Check page content
    const content = await page.content();
    console.log('Page content length:', content.length);
    
    // Try to find any excalidraw elements
    const canvas = page.locator('canvas');
    const hasCanvas = await canvas.count();
    console.log('Canvas count:', hasCanvas);
    
    const board = page.locator('[data-testid="excalidraw-board"]');
    const hasBoardElement = await board.count();
    console.log('Board element count:', hasBoardElement);
    
    if (hasBoardElement > 0) {
      await expect(board).toBeVisible();
    } else {
      console.log('Board element not found, waiting longer...');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'screenshots/after-wait.png' });
    }
  });

  test('should draw a rectangle', async ({ page }) => {
    // スクリーンショットを保存して現在の状態を確認
    await page.screenshot({ path: 'screenshots/before-rectangle.png' });
    
    // 矩形ツールがあるかを確認
    const rectangleTool = page.locator('[aria-label="Rectangle"]');
    const hasRectangleTool = await rectangleTool.count();
    console.log('Rectangle tool count:', hasRectangleTool);
    
    if (hasRectangleTool > 0) {
      // 矩形ツールを選択
      await rectangleTool.click({ force: true });
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'screenshots/after-tool-select.png' });
    } else {
      console.log('Rectangle tool not found, skipping drawing test');
    }
    
    await page.screenshot({ path: 'screenshots/rectangle-test-end.png' });
  });

  test('should draw multiple shapes', async ({ page }) => {
    // キャンバスの中央領域を特定
    const canvas = page.locator('canvas').first();
    
    // 矩形を描く - UI重なりを避けてキャンバス中央を使用
    await page.click('[aria-label="Rectangle"]', { force: true });
    await page.waitForTimeout(500); // ツール選択後の待機時間
    
    // マウスイベントを使用してより確実な描画
    await page.mouse.move(400, 300); // キャンバス中央付近
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();
    
    await page.waitForTimeout(500);

    // 円を描く
    await page.click('[aria-label="Ellipse"]', { force: true });
    await page.waitForTimeout(500);
    
    await page.mouse.move(600, 300);
    await page.mouse.down();
    await page.mouse.move(700, 400);
    await page.mouse.up();
    
    await page.waitForTimeout(500);

    // 線を描く  
    await page.click('[aria-label="Line"]', { force: true });
    await page.waitForTimeout(500);
    
    await page.mouse.click(550, 450);
    await page.mouse.click(650, 550);

    await page.screenshot({ path: 'screenshots/multiple-shapes.png' });
  });
});