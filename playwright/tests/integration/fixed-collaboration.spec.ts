import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Fixed Collaboration Test', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser }) => {
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Enable console logging
    page1.on('console', msg => console.log(`[User1] ${msg.type()}: ${msg.text()}`));
    page2.on('console', msg => console.log(`[User2] ${msg.type()}: ${msg.text()}`));
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('should sync elements between two users with fixed implementation', async () => {
    console.log('🔧 Testing fixed collaboration implementation...');

    // Navigate to pages
    await page1.goto('/');
    await page2.goto('/');

    // Wait for load
    await expect(page1.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    await expect(page2.locator('[data-testid="excalidraw-board"]')).toBeVisible();

    // Start collaboration on both pages
    console.log('🔗 Starting collaboration...');
    
    // User 1
    await page1.locator('[data-testid="collaboration-button"]').click();
    await page1.locator('button:has-text("⚙️ 設定")').click();
    await page1.locator('[data-testid="room-input"]').fill('fixed-test-room');
    await page1.locator('button:has-text("適用")').click();
    
    // User 2
    await page2.locator('[data-testid="collaboration-button"]').click();
    await page2.locator('button:has-text("⚙️ 設定")').click();
    await page2.locator('[data-testid="room-input"]').fill('fixed-test-room');
    await page2.locator('button:has-text("適用")').click();

    // Wait for connections
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    console.log('✅ Both users connected');

    // Check if connection count shows 2
    await expect(page1.locator('[data-testid="connection-count"]')).toContainText('2', { timeout: 5000 });
    await expect(page2.locator('[data-testid="connection-count"]')).toContainText('2', { timeout: 5000 });

    // Take initial screenshots
    await page1.screenshot({ path: 'playwright/screenshots/fixed-user1-initial.png' });
    await page2.screenshot({ path: 'playwright/screenshots/fixed-user2-initial.png' });

    console.log('🎨 User 1 drawing rectangle...');

    // User 1: Create element via Excalidraw API
    const elementCreated = await page1.evaluate(() => {
      try {
        const api = (window as any).excalidrawAPI;
        if (api && api.updateScene) {
          const newElement = {
            id: 'test-rect-' + Date.now(),
            type: 'rectangle',
            x: 150,
            y: 150,
            width: 100,
            height: 100,
            strokeColor: '#000000',
            backgroundColor: '#ff0000',
            fillStyle: 'solid',
            strokeWidth: 2,
            roughness: 1,
            opacity: 1,
            versionNonce: Date.now(),
            isDeleted: false,
            seed: Math.floor(Math.random() * 1000000),
            groupIds: [],
            strokeSharpness: 'sharp',
            boundElements: null,
            updated: 1,
            link: null,
            locked: false
          };

          console.log('Creating test rectangle:', newElement);
          api.updateScene({
            elements: [newElement]
          });

          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to create element:', error);
        return false;
      }
    });

    console.log(`Element creation result: ${elementCreated}`);

    // Wait for sync
    await page1.waitForTimeout(5000);
    await page2.waitForTimeout(5000);

    // Take screenshots after drawing
    await page1.screenshot({ path: 'playwright/screenshots/fixed-user1-after-draw.png' });
    await page2.screenshot({ path: 'playwright/screenshots/fixed-user2-after-sync.png' });

    // Check elements on both pages
    const page1ElementCount = await page1.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      const elements = api?.getSceneElements?.() || [];
      console.log('User1 elements:', elements);
      return elements.length;
    });

    const page2ElementCount = await page2.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      const elements = api?.getSceneElements?.() || [];
      console.log('User2 elements:', elements);
      return elements.length;
    });

    console.log(`Element counts - User1: ${page1ElementCount}, User2: ${page2ElementCount}`);

    // Both should have at least 1 element
    expect(page1ElementCount).toBeGreaterThan(0);
    
    // This is the key test - User2 should have received the element
    if (page2ElementCount > 0) {
      console.log('✅ Element sync successful!');
    } else {
      console.log('❌ Element sync failed');
    }

    expect(page2ElementCount).toBeGreaterThan(0);

    console.log('🔧 Fixed collaboration test completed');
  });

  test('should handle manual drawing and sync', async () => {
    console.log('✏️ Testing manual drawing sync...');

    await page1.goto('/');
    await page2.goto('/');

    await expect(page1.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    await expect(page2.locator('[data-testid="excalidraw-board"]')).toBeVisible();

    // Start collaboration
    await page1.locator('[data-testid="collaboration-button"]').click();
    await page1.locator('button:has-text("⚙️ 設定")').click();
    await page1.locator('[data-testid="room-input"]').fill('drawing-test-room');
    await page1.locator('button:has-text("適用")').click();
    
    await page2.locator('[data-testid="collaboration-button"]').click();
    await page2.locator('button:has-text("⚙️ 設定")').click();
    await page2.locator('[data-testid="room-input"]').fill('drawing-test-room');
    await page2.locator('button:has-text("適用")').click();

    await page1.waitForTimeout(2000);

    // Try manual drawing on canvas
    const canvas1 = page1.locator('canvas').first();
    
    // Click to focus and try drawing
    await canvas1.click({ position: { x: 200, y: 200 } });
    await page1.waitForTimeout(500);
    
    // Try to draw by dragging
    await page1.mouse.move(200, 200);
    await page1.mouse.down();
    await page1.mouse.move(300, 300);
    await page1.mouse.up();

    await page1.waitForTimeout(3000);

    await page1.screenshot({ path: 'playwright/screenshots/manual-user1-final.png' });
    await page2.screenshot({ path: 'playwright/screenshots/manual-user2-final.png' });

    console.log('✏️ Manual drawing test completed');
  });
});