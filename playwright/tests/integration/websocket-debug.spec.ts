import { test, expect } from '@playwright/test';

test.describe('WebSocket Debug', () => {
  test('should debug WebSocket connection and sync mechanism', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Listen to console messages for debugging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('Browser Console:', text);
    });

    // Listen to network events
    page.on('request', request => {
      if (request.url().includes('3002')) {
        console.log('WebSocket Request:', request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes('3002')) {
        console.log('WebSocket Response:', response.status(), response.url());
      }
    });

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/websocket-debug-initial.png', fullPage: true });

    // Try to start collaboration
    const menuButton = page.locator('button[aria-label*="Menu"], .App-menu__trigger, [data-testid*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(1000);

      // Look for collaboration start button
      const collabStart = page.getByText('コラボレーション開始');
      if (await collabStart.isVisible()) {
        console.log('Found collaboration start button');
        await collabStart.click();
        await page.waitForTimeout(5000); // Wait longer for WebSocket connection
        
        await page.screenshot({ path: 'screenshots/websocket-debug-after-start.png', fullPage: true });
      } else {
        console.log('Collaboration start button not found');
      }

      // Close menu
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Try to draw something to trigger sync
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/websocket-debug-after-draw.png', fullPage: true });

    // Add some script to check WebSocket state directly
    const wsState = await page.evaluate(() => {
      // Try to access WebSocket through window object
      const excalidrawBoard = document.querySelector('[data-testid="excalidraw-board"]');
      return {
        excalidrawExists: !!excalidrawBoard,
        websocketUrl: (window as any).VITE_WEBSOCKET_URL || 'not set',
        location: window.location.href
      };
    });

    console.log('WebSocket State:', wsState);
    console.log('All Console Logs:', consoleLogs);

    // Check if connection status is visible
    const connectionStatus = page.locator('text=接続中, text=切断, text=未接続').first();
    if (await connectionStatus.isVisible()) {
      const statusText = await connectionStatus.textContent();
      console.log('Connection status:', statusText);
    }

    await page.screenshot({ path: 'screenshots/websocket-debug-final.png', fullPage: true });
  });
});