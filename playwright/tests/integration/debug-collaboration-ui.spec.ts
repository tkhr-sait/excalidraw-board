import { test, expect } from '@playwright/test';

/**
 * Debug test to understand LiveCollaborationTrigger issues
 */

test.describe('Debug Collaboration UI', () => {
  test('should find LiveCollaborationTrigger and check UI elements', async ({ page }) => {
    console.log('Starting debug test...');
    
    // Navigate to the application
    await page.goto('http://localhost:5174');
    await page.waitForSelector('[data-testid="excalidraw-board"]');
    
    // Take initial screenshot
    await page.screenshot({ path: 'playwright/screenshots/debug-initial.png' });

    console.log('Page loaded, checking UI elements...');

    // Check if LiveCollaborationTrigger is present
    const liveTriggers = await page.locator('[data-testid="live-collaboration-trigger"]').count();
    console.log('LiveCollaborationTrigger count:', liveTriggers);

    // If not found, check for any button in the top-right area
    const allButtons = await page.locator('button').count();
    console.log('Total buttons found:', allButtons);

    // Check for any collaboration-related elements
    const collabElements = await page.locator('[data-testid*="collab"]').count();
    console.log('Collaboration elements found:', collabElements);

    // Get all elements with test IDs
    const testElements = await page.locator('[data-testid]').all();
    console.log('Elements with data-testid:');
    for (const element of testElements) {
      const testId = await element.getAttribute('data-testid');
      console.log('- ', testId);
    }

    // Check if we can find the Excalidraw component structure
    const excalidrawElements = await page.locator('.excalidraw').count();
    console.log('Excalidraw elements:', excalidrawElements);

    // Look for canvas elements
    const canvasElements = await page.locator('canvas').count();
    console.log('Canvas elements:', canvasElements);

    // Check console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const logMsg = `${msg.type()}: ${msg.text()}`;
      consoleLogs.push(logMsg);
      console.log('Console:', logMsg);
    });

    // Wait a bit for any async content to load
    await page.waitForTimeout(5000);

    // Take final screenshot
    await page.screenshot({ path: 'playwright/screenshots/debug-final.png' });

    // Print all console logs
    console.log('All console logs:');
    consoleLogs.forEach(log => console.log(log));

    // Export the page's HTML for inspection
    const html = await page.content();
    console.log('Page HTML length:', html.length);
    
    // Basic assertions
    expect(await page.locator('[data-testid="excalidraw-board"]').count()).toBe(1);
  });
});