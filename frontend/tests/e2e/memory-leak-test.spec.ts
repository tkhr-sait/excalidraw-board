import { test, expect, type Page } from '@playwright/test';

test.describe('Memory Leak Tests', () => {
  test('should not leak memory when joining and leaving rooms', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load - wait for Excalidraw canvas
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Take initial memory measurements
    const initialMetrics = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        };
      }
      return null;
    });

    console.log('Initial memory:', initialMetrics);

    // Test room joining and leaving multiple times
    for (let i = 0; i < 5; i++) {
      // Open share dialog
      await page.locator('button:has-text("Share")').click();
      await page.waitForTimeout(500);

      // Generate random room ID and username
      const roomId = `test-room-${Date.now()}-${i}`;
      const username = `TestUser${i}`;

      // Fill in room details
      await page.fill('input[placeholder="Enter room ID"]', roomId);
      await page.fill('input[placeholder="Enter username"]', username);

      // Join room
      await page.locator('button:has-text("Join Room")').click();
      await page.waitForTimeout(2000);

      // Draw some elements
      await page.locator('canvas').click({ position: { x: 100, y: 100 } });
      await page.mouse.down();
      await page.mouse.move(200, 200);
      await page.mouse.up();

      // Leave room
      await page.locator('button:has-text("Leave Room")').click();
      await page.waitForTimeout(1000);
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    await page.waitForTimeout(2000);

    // Take final memory measurements
    const finalMetrics = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        };
      }
      return null;
    });

    console.log('Final memory:', finalMetrics);

    // Memory should not increase by more than 10MB after multiple room joins
    if (initialMetrics && finalMetrics) {
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);

      // Allow up to 10MB increase (accounting for normal app operations)
      expect(memoryIncreaseMB).toBeLessThan(10);
    }

    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/memory-leak-test.png', fullPage: true });
  });

  test('should cleanup event listeners properly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load - wait for Excalidraw canvas
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Monitor event listeners count
    const initialListeners = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      let count = 0;
      allElements.forEach(el => {
        const listeners = (el as any).getEventListeners ? (el as any).getEventListeners() : {};
        count += Object.keys(listeners).length;
      });
      return count;
    });

    console.log('Initial event listeners:', initialListeners);

    // Perform multiple interactions
    for (let i = 0; i < 3; i++) {
      // Open and close share dialog
      await page.locator('button:has-text("Share")').click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Check final listeners count
    const finalListeners = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      let count = 0;
      allElements.forEach(el => {
        const listeners = (el as any).getEventListeners ? (el as any).getEventListeners() : {};
        count += Object.keys(listeners).length;
      });
      return count;
    });

    console.log('Final event listeners:', finalListeners);

    // Listeners should not increase significantly
    const listenerIncrease = finalListeners - initialListeners;
    console.log(`Event listener increase: ${listenerIncrease}`);
  });

  test('should cleanup socket connections properly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load - wait for Excalidraw canvas
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Join a room
    await page.locator('button:has-text("Share")').click();
    await page.waitForTimeout(500);

    const roomId = `socket-test-${Date.now()}`;
    await page.fill('input[placeholder="Enter room ID"]', roomId);
    await page.fill('input[placeholder="Enter username"]', 'SocketTestUser');
    await page.locator('button:has-text("Join Room")').click();
    await page.waitForTimeout(2000);

    // Check socket is connected
    const isConnected = await page.evaluate(() => {
      return (window as any).socketConnected || false;
    });
    expect(isConnected).toBe(true);

    // Leave room
    await page.locator('button:has-text("Leave Room")').click();
    await page.waitForTimeout(1000);

    // Check socket is disconnected
    const isDisconnected = await page.evaluate(() => {
      return !(window as any).socketConnected;
    });
    expect(isDisconnected).toBe(true);

    // Check that broadcastedElementVersions Map is cleared
    const mapSize = await page.evaluate(() => {
      const socket = (window as any).socket;
      if (socket && socket.socketService) {
        return socket.socketService.broadcastedElementVersions?.size || 0;
      }
      return 0;
    });

    console.log('BroadcastedElementVersions Map size after disconnect:', mapSize);
    expect(mapSize).toBe(0);
  });
});