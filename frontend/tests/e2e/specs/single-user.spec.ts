import { test, expect } from '@playwright/test';
import { WelcomePage } from '../pages/WelcomePage';
import { BoardPage } from '../pages/BoardPage';
import { testShapes, testRooms, TestDataManager, testTimeouts } from '../fixtures/test-data';

test.describe('Single User Integration Tests', () => {
  let roomId: string;

  test.beforeEach(async () => {
    roomId = TestDataManager.getCleanRoomId('single-user');
  });

  test('should load application and display welcome page', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    
    await welcomePage.goto();
    await welcomePage.waitForPageLoad();
    
    // Verify all essential elements are present
    await expect(welcomePage.title).toBeVisible();
    await expect(welcomePage.createNewBoardButton).toBeVisible();
    await expect(welcomePage.roomIdInput).toBeVisible();
    await expect(welcomePage.joinRoomButton).toBeVisible();
  });

  test('should create new room and load board successfully', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    
    await welcomePage.goto();
    await welcomePage.waitForPageLoad();
    
    // Create new room
    const generatedRoomId = await welcomePage.createNewRoom();
    
    // Verify board loads
    const boardPage = new BoardPage(page);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection(testTimeouts.connection);
    
    // Verify room ID matches
    const displayedRoomId = await boardPage.getRoomId();
    expect(displayedRoomId).toBe(generatedRoomId);
    
    // Verify connection status
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    expect(await boardPage.getUserCount()).toBe(1);
  });

  test('should join existing room successfully', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    
    await welcomePage.goto();
    await welcomePage.waitForPageLoad();
    
    // Join specific room
    await welcomePage.joinRoom(roomId);
    
    // Verify board loads with correct room
    const boardPage = new BoardPage(page);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    const displayedRoomId = await boardPage.getRoomId();
    expect(displayedRoomId).toBe(roomId);
  });

  test('should establish WebSocket connection and show status', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    
    // Wait for connection with detailed verification
    await boardPage.waitForConnection(testTimeouts.connection);
    
    // Verify connection indicator
    const connectionStatus = await boardPage.getConnectionStatus();
    expect(connectionStatus).toBe('connected');
    
    // Verify user count
    const userCount = await boardPage.getUserCount();
    expect(userCount).toBe(1);
    
    // Verify connection indicator color (should be green)
    const indicatorColor = await page.locator('.absolute.top-4.right-4 .w-3.h-3.rounded-full').evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    expect(indicatorColor).toContain('rgb(34, 197, 94)'); // green-500
  });

  test('should display and interact with Excalidraw canvas', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Verify Excalidraw elements are present
    await expect(boardPage.excalidrawContainer).toBeVisible();
    await expect(boardPage.canvas).toBeVisible();
    
    // Test canvas interaction
    await boardPage.clickCanvas(200, 200);
    
    // Canvas should be interactive (no errors thrown)
    const canvasBox = await boardPage.canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
  });

  test('should handle drawing operations', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Test rectangle drawing
    await boardPage.drawRectangle(
      testShapes.rectangle.x,
      testShapes.rectangle.y,
      testShapes.rectangle.width!,
      testShapes.rectangle.height!
    );
    
    // Wait for drawing to complete
    await page.waitForTimeout(testTimeouts.drawing);
    
    // Test circle drawing
    await boardPage.drawCircle(
      testShapes.ellipse.x,
      testShapes.ellipse.y,
      testShapes.ellipse.width! / 2
    );
    
    await page.waitForTimeout(testTimeouts.drawing);
    
    // Take screenshot to verify drawings
    await expect(page).toHaveScreenshot('single-user-drawings.png');
  });

  test('should handle room sharing functionality', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Test share room button
    await expect(boardPage.shareRoomButton).toBeVisible();
    
    // Click share button (this copies URL to clipboard)
    await boardPage.shareRoom();
    
    // Verify button feedback (text should change temporarily)
    await expect(boardPage.shareRoomButton).toContainText('Copied!', { timeout: 2000 });
    
    // Should return to original text
    await expect(boardPage.shareRoomButton).toContainText('Share Room', { timeout: 3000 });
  });

  test('should handle invalid room ID gracefully', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    // Navigate to room with empty ID
    await page.goto('/room/');
    
    // Should show invalid room message
    await expect(page.locator('text=Invalid Room')).toBeVisible();
    await expect(page.locator('text=Room ID is required')).toBeVisible();
  });

  test('should maintain state during page interaction', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Draw something
    await boardPage.drawRectangle(100, 100, 100, 100);
    await page.waitForTimeout(testTimeouts.drawing);
    
    // Verify connection is maintained during drawing
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Interact with header elements
    await boardPage.shareRoom();
    
    // Connection should still be stable
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Canvas should still be functional
    await boardPage.clickCanvas(300, 300);
  });

  test('should handle window resize gracefully', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Get initial canvas size
    const initialCanvasBox = await boardPage.canvas.boundingBox();
    
    // Resize window
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    
    // Canvas should still be visible and responsive
    await expect(boardPage.canvas).toBeVisible();
    
    const newCanvasBox = await boardPage.canvas.boundingBox();
    expect(newCanvasBox).toBeTruthy();
    
    // Canvas should have adjusted to new size
    expect(newCanvasBox!.width).toBeGreaterThan(0);
    expect(newCanvasBox!.height).toBeGreaterThan(0);
    
    // Connection should be maintained
    expect(await boardPage.getConnectionStatus()).toBe('connected');
  });

  test.afterEach(async () => {
    // Cleanup test data if needed
    TestDataManager.cleanup();
  });
});