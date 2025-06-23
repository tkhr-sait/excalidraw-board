import { test, expect } from '@playwright/test';

test.describe('Simple Drawing', () => {
  test('should create rectangle using force click and keyboard', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Listen to console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('Browser Console:', text);
    });

    // Start collaboration first
    const collabStart = page.getByText('コラボ開始');
    if (await collabStart.isVisible()) {
      await collabStart.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'screenshots/simple-drawing-ready.png', fullPage: true });

    // Method 1: Use keyboard shortcut (R for Rectangle)
    console.log('Trying keyboard shortcut R for rectangle...');
    await page.keyboard.press('r');
    await page.waitForTimeout(500);

    // Method 2: If keyboard doesn't work, try force click
    try {
      const rectTool = page.locator('[data-testid="toolbar-rectangle"]').first();
      console.log('Force clicking rectangle tool...');
      await rectTool.click({ force: true });
      await page.waitForTimeout(500);
    } catch (error) {
      console.log('Force click failed:', error);
    }

    await page.screenshot({ path: 'screenshots/simple-drawing-tool-selected.png', fullPage: true });

    // Draw rectangle in center of canvas
    console.log('Drawing rectangle...');
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/simple-drawing-drawn.png', fullPage: true });

    // Check if elements were created
    const hasElements = consoleLogs.some(log => 
      log.includes('elements: Array(') && !log.includes('Array(0)')
    );
    
    console.log('Has elements created:', hasElements);
    console.log('Recent sync messages:');
    consoleLogs.filter(log => log.includes('elements: Array')).slice(-5).forEach(log => {
      console.log('  ', log);
    });
  });
});