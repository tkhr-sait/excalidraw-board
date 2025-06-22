import { test, expect } from '@playwright/test';
import { WelcomePage } from './pages/WelcomePage';
import { BoardPage } from './pages/BoardPage';
import { TestDataUtils, TestTimeouts } from './helpers/test-data';

test.describe('Basic Application Functionality', () => {
  test('should display welcome page correctly', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    
    await welcomePage.goto();
    await welcomePage.waitForPageLoad();
    
    // Check that main elements are visible
    await expect(welcomePage.title).toBeVisible();
    await expect(welcomePage.createNewBoardButton).toBeVisible();
    await expect(welcomePage.roomIdInput).toBeVisible();
    await expect(welcomePage.joinRoomButton).toBeVisible();
  });

  test('should create new room and navigate to board', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    
    await welcomePage.goto();
    await welcomePage.waitForPageLoad();
    
    // Create new room
    const roomId = await welcomePage.createNewRoom();
    
    // Verify navigation to board page
    expect(roomId).toMatch(/^[a-zA-Z0-9]+$/);
    expect(page.url()).toContain(`/room/${roomId}`);
  });

  test('should join existing room', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    const roomId = TestDataUtils.generateRoomId('join-test');
    
    await welcomePage.goto();
    await welcomePage.waitForPageLoad();
    
    // Join room using button
    await welcomePage.joinRoom(roomId);
    
    // Verify navigation
    expect(page.url()).toContain(`/room/${roomId}`);
  });

  test('should join room using Enter key', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    const roomId = TestDataUtils.generateRoomId('enter-test');
    
    await welcomePage.goto();
    await welcomePage.waitForPageLoad();
    
    // Join room using Enter key
    await welcomePage.joinRoomByEnter(roomId);
    
    // Verify navigation
    expect(page.url()).toContain(`/room/${roomId}`);
  });

  test('should load board page correctly', async ({ page }) => {
    const roomId = TestDataUtils.generateRoomId('board-test');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    
    // Check that board elements are visible
    await expect(boardPage.excalidrawContainer).toBeVisible();
    await expect(boardPage.canvas).toBeVisible();
    await expect(boardPage.roomIdDisplay).toContainText(roomId);
  });

  test('should establish WebSocket connection', async ({ page }) => {
    const roomId = TestDataUtils.generateRoomId('connection-test');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    
    // Wait for connection
    await boardPage.waitForConnection(TestTimeouts.CONNECTION);
    
    // Verify connection status
    const status = await boardPage.getConnectionStatus();
    expect(status).toBe('connected');
    
    // Verify user count
    const userCount = await boardPage.getUserCount();
    expect(userCount).toBe(1);
  });

  test('should display room information in header', async ({ page }) => {
    const roomId = TestDataUtils.generateRoomId('header-test');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Check header elements
    await expect(boardPage.roomIdDisplay).toBeVisible();
    await expect(boardPage.shareRoomButton).toBeVisible();
    await expect(boardPage.connectionStatus).toBeVisible();
    
    // Verify room ID is correct
    const displayedRoomId = await boardPage.getRoomId();
    expect(displayedRoomId).toBe(roomId);
  });

  test('should handle invalid room ID gracefully', async ({ page }) => {
    const boardPage = new BoardPage(page);
    
    // Navigate directly to room without room ID
    await page.goto('/room/');
    
    // Should show error or redirect
    await expect(page.locator('text=Invalid Room')).toBeVisible();
  });
});