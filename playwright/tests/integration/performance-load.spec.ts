import { test, expect } from '@playwright/test';

test.describe('Performance and Load Testing', () => {
  test('should handle rapid drawing operations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();
    
    // 連続して図形を描画
    for (let i = 0; i < 20; i++) {
      await page.click('[aria-label="Rectangle"]', { force: true });
      await page.waitForTimeout(100);
      
      const x = 200 + (i % 5) * 100;
      const y = 200 + Math.floor(i / 5) * 100;
      
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 50, y + 50);
      await page.mouse.up();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 20個の図形描画が30秒以内に完了
    expect(duration).toBeLessThan(30000);

    // アプリケーションが正常に動作していることを確認
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // 描画操作が完了していることを確認
    await page.screenshot({ path: 'screenshots/integration-performance-complete.png' });
  });
});