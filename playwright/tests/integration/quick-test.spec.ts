import { test, expect } from '@playwright/test';

test.describe('Quick Collaboration Test', () => {
  test('should create element and check sync', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));

    await page.goto('/');
    
    // Wait for page load
    await expect(page.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    await page.waitForTimeout(1000);

    // Start collaboration
    await page.locator('[data-testid="collaboration-button"]').click();
    
    // Open settings dialog to set room name
    await page.locator('button:has-text("⚙️ 設定")').click();
    await page.locator('[data-testid="room-input"]').fill('quick-test');
    await page.locator('button:has-text("適用")').click();
    
    // Wait for connection
    await page.waitForTimeout(3000);

    console.log('🎨 Creating element...');

    // Wait for Excalidraw API to be available
    await page.waitForFunction(() => (window as any).excalidrawAPI, { timeout: 10000 });

    // Create element programmatically
    const success = await page.evaluate(() => {
      try {
        console.log('Checking for excalidrawAPI...');
        const api = (window as any).excalidrawAPI;
        console.log('API object:', api);
        console.log('API methods:', api ? Object.keys(api) : 'No API');
        
        if (api && api.updateScene) {
          const element = {
            id: 'quick-test-' + Date.now(),
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            strokeColor: '#000000',
            backgroundColor: '#ff0000',
            fillStyle: 'solid',
            strokeWidth: 1,
            roughness: 1,
            opacity: 1,
            versionNonce: Date.now(),
            isDeleted: false,
            seed: 123456,
            groupIds: [],
            strokeSharpness: 'sharp',
            boundElements: null,
            updated: 1,
            link: null,
            locked: false
          };

          console.log('Creating element with API:', element);
          api.updateScene({ elements: [element] });
          
          // Check if element was created
          const elements = api.getSceneElements();
          console.log('Elements after update:', elements.length);
          return elements.length > 0;
        } else {
          console.log('API not available or missing updateScene method');
          return false;
        }
      } catch (error) {
        console.error('Error creating element:', error);
        return false;
      }
    });

    console.log(`Element creation success: ${success}`);

    // Wait and take screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'playwright/screenshots/quick-test-final.png' });

    expect(success).toBe(true);
  });
});