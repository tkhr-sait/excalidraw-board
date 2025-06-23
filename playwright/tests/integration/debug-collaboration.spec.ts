import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Debug Collaboration Communication', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser }) => {
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Enable console logging for both pages
    page1.on('console', msg => console.log(`[Page1] ${msg.type()}: ${msg.text()}`));
    page2.on('console', msg => console.log(`[Page2] ${msg.type()}: ${msg.text()}`));
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('should debug WebSocket communication and element sync', async () => {
    console.log('🔍 Starting collaboration debug test...');

    // Navigate both pages
    await page1.goto('/');
    await page2.goto('/');

    // Wait for pages to load
    await expect(page1.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    await expect(page2.locator('[data-testid="excalidraw-board"]')).toBeVisible();

    console.log('✅ Both pages loaded successfully');

    // User 1: Start collaboration
    await page1.locator('[data-testid="collaboration-button"]').click();
    await page1.locator('[data-testid="room-input"]').fill('debug-room-123');
    
    console.log('🔗 User 1 started collaboration');

    // User 2: Join the same room
    await page2.locator('[data-testid="collaboration-button"]').click();
    await page2.locator('[data-testid="room-input"]').fill('debug-room-123');

    console.log('🔗 User 2 joined collaboration');

    // Wait for connections
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Take screenshots
    await page1.screenshot({ path: 'playwright/screenshots/debug-page1-connected.png' });
    await page2.screenshot({ path: 'playwright/screenshots/debug-page2-connected.png' });

    // Check connection status
    const status1 = await page1.locator('[data-testid="collaboration-status"]').textContent();
    const status2 = await page2.locator('[data-testid="collaboration-status"]').textContent();
    console.log(`Connection Status - Page1: ${status1}, Page2: ${status2}`);

    // Check connection count
    const count1 = await page1.locator('[data-testid="connection-count"]').textContent();
    const count2 = await page2.locator('[data-testid="connection-count"]').textContent();
    console.log(`Connection Count - Page1: ${count1}, Page2: ${count2}`);

    // User 1: Draw a rectangle
    console.log('🎨 User 1 drawing rectangle...');
    
    // Select rectangle tool (assuming default toolbar)
    const canvas1 = page1.locator('canvas').first();
    await canvas1.click({ position: { x: 100, y: 100 } });
    
    // Try to simulate drawing a rectangle
    await page1.keyboard.press('r'); // Rectangle hotkey in Excalidraw
    await page1.waitForTimeout(500);
    
    // Draw rectangle by dragging
    await canvas1.hover({ position: { x: 200, y: 200 } });
    await page1.mouse.down();
    await page1.mouse.move(300, 300);
    await page1.mouse.up();

    console.log('✏️ Rectangle drawn by User 1');

    // Wait for sync
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Take screenshots after drawing
    await page1.screenshot({ path: 'playwright/screenshots/debug-page1-after-draw.png' });
    await page2.screenshot({ path: 'playwright/screenshots/debug-page2-after-sync.png' });

    // Check if elements are present in both canvases
    const page1Elements = await page1.evaluate(() => {
      // Try to access Excalidraw API if available
      return (window as any).excalidrawAPI?.getSceneElements?.()?.length || 'API not available';
    });

    const page2Elements = await page2.evaluate(() => {
      return (window as any).excalidrawAPI?.getSceneElements?.()?.length || 'API not available';
    });

    console.log(`Elements count - Page1: ${page1Elements}, Page2: ${page2Elements}`);

    // Test cursor sync
    console.log('🖱️ Testing cursor sync...');
    await canvas1.hover({ position: { x: 400, y: 400 } });
    await page1.waitForTimeout(1000);

    console.log('🔍 Debug test completed');
  });

  test('should test manual element creation and sync', async () => {
    console.log('🔍 Testing manual element creation...');

    await page1.goto('/');
    await page2.goto('/');

    await expect(page1.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    await expect(page2.locator('[data-testid="excalidraw-board"]')).toBeVisible();

    // Start collaboration
    await page1.locator('[data-testid="collaboration-button"]').click();
    await page1.locator('[data-testid="room-input"]').fill('manual-test-room');
    
    await page2.locator('[data-testid="collaboration-button"]').click();
    await page2.locator('[data-testid="room-input"]').fill('manual-test-room');

    await page1.waitForTimeout(2000);

    // Try to manually create an element via Excalidraw API
    const elementCreated = await page1.evaluate(() => {
      try {
        const api = (window as any).excalidrawAPI;
        if (api && api.updateScene) {
          const newElement = {
            id: 'test-rect-' + Date.now(),
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'hachure',
            strokeWidth: 1,
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

          api.updateScene({
            elements: [newElement]
          });

          console.log('Created element:', newElement);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to create element:', error);
        return false;
      }
    });

    console.log(`Element creation result: ${elementCreated}`);

    await page1.waitForTimeout(3000);

    // Take final screenshots
    await page1.screenshot({ path: 'playwright/screenshots/manual-page1-final.png' });
    await page2.screenshot({ path: 'playwright/screenshots/manual-page2-final.png' });

    console.log('🔍 Manual test completed');
  });
});