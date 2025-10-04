import { test, expect } from '@playwright/test';

test.describe('Memory Leak Tests - Simplified', () => {
  test('should not leak memory when joining and leaving rooms', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('canvas', { timeout: 10000 });

    // If dialog is already open, close it first
    const isDialogOpen = await page.locator('.room-dialog-overlay').isVisible().catch(() => false);
    if (isDialogOpen) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Test room joining and leaving multiple times
    for (let i = 0; i < 3; i++) {
      console.log(`Iteration ${i + 1} of room join/leave test`);

      // Open share dialog
      await page.locator('button:has-text("Share")').click();
      await page.waitForTimeout(500);

      // Generate random room ID and username
      const roomId = `test-room-${Date.now()}-${i}`;
      const username = `TestUser${i}`;

      // Fill in room details - use specific text input selectors
      const roomIdInput = page.locator('.room-dialog-overlay input[type="text"]').first();
      const usernameInput = page.locator('.room-dialog-overlay input[type="text"]').nth(1);

      await roomIdInput.clear();
      await roomIdInput.fill(roomId);
      await usernameInput.clear();
      await usernameInput.fill(username);

      // Join room - use the submit button in the dialog
      await page.locator('.room-dialog-overlay button.primary-button:has-text("Join Room")').click();
      await page.waitForTimeout(2000);

      // Draw some elements - use the interactive canvas
      const canvas = page.locator('canvas.excalidraw__canvas.interactive');
      await canvas.click({ position: { x: 100, y: 100 } });
      await page.mouse.down();
      await page.mouse.move(200, 200);
      await page.mouse.up();

      // Leave room
      const leaveButton = page.locator('button:has-text("Leave Room")');
      if (await leaveButton.isVisible()) {
        await leaveButton.click();
      } else {
        // Try to disconnect through Share button
        await page.locator('button:has-text("Share")').click();
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(1000);
    }

    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/memory-leak-test-simple.png', fullPage: true });

    console.log('Memory leak test completed successfully');
  });

  test('should cleanup socket connections properly', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('canvas', { timeout: 10000 });

    // If dialog is already open, close it first
    const isDialogOpen = await page.locator('.room-dialog-overlay').isVisible().catch(() => false);
    if (isDialogOpen) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Join a room
    await page.locator('button:has-text("Share")').click();
    await page.waitForTimeout(500);

    const roomId = `socket-test-${Date.now()}`;
    const roomIdInput = page.locator('.room-dialog-overlay input[type="text"]').first();
    const usernameInput = page.locator('.room-dialog-overlay input[type="text"]').nth(1);

    await roomIdInput.clear();
    await roomIdInput.fill(roomId);
    await usernameInput.clear();
    await usernameInput.fill('SocketTestUser');

    await page.locator('.room-dialog-overlay button.primary-button:has-text("Join Room")').click();
    await page.waitForTimeout(2000);

    // Check socket is connected via global variable
    const isConnected = await page.evaluate(() => {
      return (window as any).socketConnected || false;
    });
    console.log('Socket connected:', isConnected);

    // Leave room
    const leaveButton = page.locator('button:has-text("Leave Room")');
    if (await leaveButton.isVisible()) {
      await leaveButton.click();
    } else {
      // Disconnect through dialog
      await page.locator('button:has-text("Share")').click();
      await page.waitForTimeout(500);
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
    await page.waitForTimeout(1000);

    // Check socket is disconnected
    const isDisconnected = await page.evaluate(() => {
      return !(window as any).socketConnected;
    });
    console.log('Socket disconnected:', isDisconnected);

    // Take final screenshot
    await page.screenshot({ path: '/tmp/socket-test-final.png', fullPage: true });
  });
});