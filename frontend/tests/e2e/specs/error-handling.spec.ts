import { test, expect } from '@playwright/test';
import { BoardPage } from '../pages/BoardPage';
import { CollaborationHelper } from '../helpers/collaboration';
import { testShapes, TestDataManager, testTimeouts } from '../fixtures/test-data';

test.describe('Error Handling Tests', () => {
  test('should handle network disconnection gracefully', async ({ page, context }) => {
    const roomId = TestDataManager.getCleanRoomId('network-disconnect');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Verify initial connected state
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Draw something while connected
    await boardPage.drawRectangle(
      testShapes.rectangle.x,
      testShapes.rectangle.y,
      testShapes.rectangle.width!,
      testShapes.rectangle.height!
    );
    
    await page.waitForTimeout(testTimeouts.drawing);
    
    // Simulate network disconnection
    await context.setOffline(true);
    
    // Wait for disconnection to be detected
    await page.waitForTimeout(testTimeouts.networkSimulation);
    
    // Should show disconnected overlay
    const isOverlayVisible = await boardPage.isDisconnectedOverlayVisible();
    expect(isOverlayVisible).toBe(true);
    
    // Drawing operations should still work locally
    await boardPage.drawCircle(
      testShapes.ellipse.x,
      testShapes.ellipse.y,
      testShapes.ellipse.width! / 2
    );
    
    // Restore network connection
    await context.setOffline(false);
    
    // Wait for reconnection
    await boardPage.waitForConnection(testTimeouts.connection);
    
    // Disconnected overlay should disappear
    const isOverlayStillVisible = await boardPage.isDisconnectedOverlayVisible();
    expect(isOverlayStillVisible).toBe(false);
    
    // Connection status should be restored
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Take screenshot to verify final state
    await expect(page).toHaveScreenshot('network-disconnection-recovery.png');
  });

  test('should handle reconnection button functionality', async ({ page, context }) => {
    const roomId = TestDataManager.getCleanRoomId('reconnect-button');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Simulate disconnection
    await context.setOffline(true);
    await page.waitForTimeout(testTimeouts.networkSimulation);
    
    // Verify disconnected state
    const isOverlayVisible = await boardPage.isDisconnectedOverlayVisible();
    expect(isOverlayVisible).toBe(true);
    
    // Restore network but don't auto-reconnect
    await context.setOffline(false);
    await page.waitForTimeout(1000);
    
    // Manually trigger reconnection using button
    await boardPage.reconnect();
    
    // Should reconnect successfully
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Overlay should disappear
    const isOverlayStillVisible = await boardPage.isDisconnectedOverlayVisible();
    expect(isOverlayStillVisible).toBe(false);
  });

  test('should handle partial network failures', async ({ page, context }) => {
    const roomId = TestDataManager.getCleanRoomId('partial-failure');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Draw initial content
    await boardPage.drawRectangle(100, 100, 100, 100);
    await page.waitForTimeout(testTimeouts.drawing);
    
    // Simulate slow network (not complete disconnection)
    await context.route('**/*', async route => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    // Drawing should still work but may be slower
    await boardPage.drawCircle(300, 100, 50);
    
    // Connection should eventually stabilize
    await page.waitForTimeout(5000);
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Clear network simulation
    await context.unroute('**/*');
  });

  test('should handle backend server unavailability', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('server-unavailable');
    
    // Route WebSocket connections to fail
    await page.route('**/socket.io/**', async route => {
      await route.abort('connectionrefused');
    });
    
    const boardPage = new BoardPage(page);
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    
    // Should show disconnected/connecting state
    await page.waitForTimeout(testTimeouts.connection);
    const status = await boardPage.getConnectionStatus();
    expect(status).toMatch(/disconnected|connecting/);
    
    // Clear route to allow normal connection
    await page.unroute('**/socket.io/**');
    
    // Should eventually connect
    await boardPage.waitForConnection(testTimeouts.connection * 2);
    expect(await boardPage.getConnectionStatus()).toBe('connected');
  });

  test('should handle WebSocket message corruption', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('message-corruption');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Intercept and corrupt WebSocket messages
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(...args: any[]) {
          super(...args);
          
          // Randomly corrupt some outgoing messages
          const originalSend = this.send;
          this.send = function(data: any) {
            if (Math.random() < 0.1) { // 10% corruption rate
              console.log('Corrupting WebSocket message');
              return originalSend.call(this, 'corrupted_message');
            }
            return originalSend.call(this, data);
          };
        }
      };
    });
    
    // Draw multiple shapes to trigger WebSocket communication
    for (let i = 0; i < 5; i++) {
      await boardPage.drawRectangle(i * 80 + 50, 100, 60, 60);
      await page.waitForTimeout(500);
    }
    
    // Connection should remain stable despite some corrupted messages
    expect(await boardPage.getConnectionStatus()).toBe('connected');
  });

  test('should handle concurrent error scenarios in multi-user session', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('concurrent-errors');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      const [user1Board, user2Board] = session.boardPages;
      
      await CollaborationHelper.waitForUserCount(user1Board, 2);
      await CollaborationHelper.waitForUserCount(user2Board, 2);
      
      // Both users draw something
      await Promise.all([
        user1Board.drawRectangle(100, 100, 100, 100),
        user2Board.drawRectangle(300, 100, 100, 100),
      ]);
      
      await CollaborationHelper.waitForSync(session.boardPages);
      
      // Simulate network issues for user 1 only
      await CollaborationHelper.simulateDisconnection(user1Board.page);
      
      // User 2 continues working
      await user2Board.drawCircle(200, 200, 50);
      await user2Board.page.waitForTimeout(1000);
      
      // User 2 should see user count drop to 1
      await CollaborationHelper.waitForUserCount(user2Board, 1, testTimeouts.connection);
      
      // User 1 reconnects
      await CollaborationHelper.restoreConnection(user1Board.page);
      await user1Board.waitForConnection(testTimeouts.connection);
      
      // Both users should see each other again
      await CollaborationHelper.waitForUserCount(user1Board, 2, testTimeouts.connection);
      await CollaborationHelper.waitForUserCount(user2Board, 2, testTimeouts.connection);
      
      // Wait for sync after reconnection
      await CollaborationHelper.waitForSync(session.boardPages);
      
      // Take final screenshots
      await CollaborationHelper.takeSessionScreenshots(session, 'concurrent-errors-recovery');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should handle rapid connect/disconnect cycles', async ({ page, context }) => {
    const roomId = TestDataManager.getCleanRoomId('rapid-cycles');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Perform rapid disconnect/reconnect cycles
    for (let i = 0; i < 3; i++) {
      // Disconnect
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      
      // Reconnect
      await context.setOffline(false);
      await page.waitForTimeout(2000);
    }
    
    // Should eventually stabilize in connected state
    await boardPage.waitForConnection(testTimeouts.connection);
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Drawing should still work after all the cycles
    await boardPage.drawRectangle(100, 100, 100, 100);
    await page.waitForTimeout(testTimeouts.drawing);
  });

  test('should handle browser tab visibility changes', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('tab-visibility');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Draw something initially
    await boardPage.drawRectangle(100, 100, 100, 100);
    await page.waitForTimeout(testTimeouts.drawing);
    
    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(2000);
    
    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(1000);
    
    // Connection should still be maintained
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Drawing should still work
    await boardPage.drawCircle(300, 100, 50);
  });

  test('should handle memory pressure gracefully', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('memory-pressure');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Create memory pressure by drawing many shapes
    const shapeCount = 50;
    for (let i = 0; i < shapeCount; i++) {
      const x = (i % 10) * 60 + 50;
      const y = Math.floor(i / 10) * 60 + 50;
      
      await boardPage.drawRectangle(x, y, 40, 40);
      
      // Don't wait too long to simulate rapid drawing
      if (i % 10 === 0) {
        await page.waitForTimeout(100);
      }
    }
    
    // Application should remain responsive
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Should be able to perform additional operations
    await boardPage.clickCanvas(500, 300);
    await page.waitForTimeout(1000);
    
    // Take screenshot to verify final state
    await expect(page).toHaveScreenshot('memory-pressure-test.png');
  });

  test.afterEach(async ({ page, context }) => {
    // Reset network conditions
    await context.setOffline(false);
    await context.clearCookies();
  });

  test.afterAll(async () => {
    TestDataManager.cleanup();
  });
});