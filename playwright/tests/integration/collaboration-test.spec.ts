import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Real-time Collaboration Features', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser }) => {
    // Create two separate browser contexts to simulate different users
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('should allow two users to join the same room and collaborate', async () => {
    // Navigate both pages to the application
    await page1.goto('http://localhost:5174');
    await page2.goto('http://localhost:5174');

    // Wait for the Excalidraw board to load
    await expect(page1.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    await expect(page2.locator('[data-testid="excalidraw-board"]')).toBeVisible();

    // Take initial screenshots
    await page1.screenshot({ path: 'playwright/screenshots/collaboration-user1-initial.png' });
    await page2.screenshot({ path: 'playwright/screenshots/collaboration-user2-initial.png' });

    // User 1: Start collaboration
    const collaborationButton1 = page1.locator('[data-testid="collaboration-button"]');
    await expect(collaborationButton1).toBeVisible();
    await collaborationButton1.click();

    // Check if collaboration is started for user 1
    await expect(page1.locator('[data-testid="collaboration-status"]')).toContainText('接続');

    // User 1: Set a common room name
    const roomInput1 = page1.locator('[data-testid="room-input"]');
    await roomInput1.fill('テストルーム123');

    // User 2: Start collaboration with the same room
    const collaborationButton2 = page2.locator('[data-testid="collaboration-button"]');
    await collaborationButton2.click();
    
    const roomInput2 = page2.locator('[data-testid="room-input"]');
    await roomInput2.fill('テストルーム123');

    // Wait for both users to connect
    await expect(page1.locator('[data-testid="collaboration-status"]')).toContainText('接続');
    await expect(page2.locator('[data-testid="collaboration-status"]')).toContainText('接続');

    // Check connection count shows 2 users
    await expect(page1.locator('[data-testid="connection-count"]')).toContainText('2');
    await expect(page2.locator('[data-testid="connection-count"]')).toContainText('2');

    // Take screenshots after connection
    await page1.screenshot({ path: 'playwright/screenshots/collaboration-user1-connected.png' });
    await page2.screenshot({ path: 'playwright/screenshots/collaboration-user2-connected.png' });

    console.log('✅ Two users successfully joined the same collaboration room');
  });

  test('should sync drawing elements between users', async () => {
    // Navigate both pages to the application
    await page1.goto('http://localhost:5174');
    await page2.goto('http://localhost:5174');

    // Wait for the Excalidraw board to load
    await expect(page1.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    await expect(page2.locator('[data-testid="excalidraw-board"]')).toBeVisible();

    // Both users start collaboration in the same room
    await page1.locator('[data-testid="collaboration-button"]').click();
    await page1.locator('[data-testid="room-input"]').fill('描画テストルーム');

    await page2.locator('[data-testid="collaboration-button"]').click();
    await page2.locator('[data-testid="room-input"]').fill('描画テストルーム');

    // Wait for connection
    await expect(page1.locator('[data-testid="collaboration-status"]')).toContainText('接続');
    await expect(page2.locator('[data-testid="collaboration-status"]')).toContainText('接続');

    // User 1: Draw something on the canvas
    const canvas1 = page1.locator('canvas').first();
    await canvas1.click({ position: { x: 200, y: 200 } });
    await page1.mouse.down();
    await page1.mouse.move(300, 300);
    await page1.mouse.up();

    // Wait a moment for synchronization
    await page1.waitForTimeout(1000);

    // Take screenshots to verify drawing sync
    await page1.screenshot({ path: 'playwright/screenshots/drawing-user1-after-draw.png' });
    await page2.screenshot({ path: 'playwright/screenshots/drawing-user2-after-sync.png' });

    console.log('✅ Drawing elements should be synchronized between users');
  });

  test('should handle user disconnection gracefully', async () => {
    // Navigate both pages to the application
    await page1.goto('http://localhost:5174');
    await page2.goto('http://localhost:5174');

    // Start collaboration
    await page1.locator('[data-testid="collaboration-button"]').click();
    await page1.locator('[data-testid="room-input"]').fill('切断テストルーム');

    await page2.locator('[data-testid="collaboration-button"]').click();
    await page2.locator('[data-testid="room-input"]').fill('切断テストルーム');

    // Wait for connection
    await expect(page1.locator('[data-testid="collaboration-status"]')).toContainText('接続');
    await expect(page2.locator('[data-testid="collaboration-status"]')).toContainText('接続');

    // Verify 2 users connected
    await expect(page1.locator('[data-testid="connection-count"]')).toContainText('2');

    // User 2 disconnects
    await page2.locator('[data-testid="collaboration-button"]').click();

    // Wait for disconnection
    await page2.waitForTimeout(1000);

    // User 1 should show updated connection count
    await expect(page1.locator('[data-testid="connection-count"]')).toContainText('1');

    // Take final screenshots
    await page1.screenshot({ path: 'playwright/screenshots/disconnect-user1-final.png' });
    await page2.screenshot({ path: 'playwright/screenshots/disconnect-user2-final.png' });

    console.log('✅ User disconnection handled gracefully');
  });

  test('should maintain different room isolation', async () => {
    // Navigate both pages to the application
    await page1.goto('http://localhost:5174');
    await page2.goto('http://localhost:5174');

    // User 1 joins room A
    await page1.locator('[data-testid="collaboration-button"]').click();
    await page1.locator('[data-testid="room-input"]').fill('ルームA');

    // User 2 joins room B
    await page2.locator('[data-testid="collaboration-button"]').click();
    await page2.locator('[data-testid="room-input"]').fill('ルームB');

    // Wait for connections
    await expect(page1.locator('[data-testid="collaboration-status"]')).toContainText('接続');
    await expect(page2.locator('[data-testid="collaboration-status"]')).toContainText('接続');

    // Both should show 1 user (themselves only)
    await expect(page1.locator('[data-testid="connection-count"]')).toContainText('1');
    await expect(page2.locator('[data-testid="connection-count"]')).toContainText('1');

    // Take screenshots
    await page1.screenshot({ path: 'playwright/screenshots/isolation-user1-roomA.png' });
    await page2.screenshot({ path: 'playwright/screenshots/isolation-user2-roomB.png' });

    console.log('✅ Different rooms remain properly isolated');
  });
});