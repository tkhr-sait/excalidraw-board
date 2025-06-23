import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should handle multiple shapes efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="excalidraw-board"]');
    await page.waitForTimeout(2000); // Excalidraw 完全ロード待ち

    const startTime = Date.now();
    
    // 10個の図形を描く（テスト時間短縮）
    for (let i = 0; i < 10; i++) {
      await page.click('[aria-label="Rectangle"]', { force: true });
      await page.waitForTimeout(100);
      
      const x = 300 + (i % 5) * 80;
      const y = 200 + Math.floor(i / 5) * 80;
      
      // マウスイベントを使用してより確実な描画
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 60, y + 60);
      await page.mouse.up();
      
      await page.waitForTimeout(100);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 10個の図形描画が15秒以内に完了すること
    expect(duration).toBeLessThan(15000);

    await page.screenshot({ path: 'screenshots/performance-test.png' });
  });

  test('should test drawing performance without collaboration', async ({ page }) => {
    // コラボレーション機能が利用できない場合は基本的な描画パフォーマンステスト
    await page.goto('/');
    await page.waitForSelector('[data-testid="excalidraw-board"]');
    await page.waitForTimeout(2000);

    const startTime = Date.now();
    
    // 基本的な描画パフォーマンステスト
    for (let i = 0; i < 5; i++) {
      await page.click('[aria-label="Rectangle"]', { force: true });
      await page.waitForTimeout(100);
      
      const x = 400 + i * 50;
      const y = 300;
      
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 40, y + 40);
      await page.mouse.up();
      
      await page.waitForTimeout(100);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 5個の図形描画が10秒以内に完了すること
    expect(duration).toBeLessThan(10000);

    await page.screenshot({ path: 'screenshots/performance-drawing-test.png' });
  });
});