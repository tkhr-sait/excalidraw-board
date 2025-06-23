import { test, expect } from '@playwright/test';

test.describe('Sync Debug', () => {
  test('should debug collaboration sync with detailed console logs', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Listen to all console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('Browser Console:', text);
    });

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/sync-debug-initial.png', fullPage: true });

    // Start collaboration using footer button
    const collabStart = page.getByText('コラボ開始');
    if (await collabStart.isVisible()) {
      console.log('Starting collaboration...');
      await collabStart.click();
      await page.waitForTimeout(5000); // Wait longer for connection
      
      await page.screenshot({ path: 'screenshots/sync-debug-after-start.png', fullPage: true });
    } else {
      console.log('Collaboration start button not found');
    }

    // Check collaboration status
    const collabStop = page.getByText('コラボ停止');
    const isCollaborating = await collabStop.isVisible();
    console.log('Is collaborating:', isCollaborating);

    // Try to draw something to trigger sync events
    console.log('Drawing rectangle...');
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'screenshots/sync-debug-after-draw.png', fullPage: true });

    // Log all console messages
    console.log('All console logs:');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });

    // Check WebSocket connection state
    const wsState = await page.evaluate(() => {
      return {
        location: window.location.href,
        websocketUrl: (window as any).VITE_WEBSOCKET_URL || 'not set'
      };
    });

    console.log('WebSocket state:', wsState);
  });
});