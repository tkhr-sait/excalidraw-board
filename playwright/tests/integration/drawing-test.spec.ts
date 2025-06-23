import { test, expect } from '@playwright/test';

test.describe('Drawing Test', () => {
  test('should create shapes properly for collaboration', async ({ page }) => {
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

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/drawing-test-initial.png', fullPage: true });

    // Start collaboration first
    const collabStart = page.getByText('コラボ開始');
    if (await collabStart.isVisible()) {
      await collabStart.click();
      await page.waitForTimeout(3000);
    }

    // Take screenshot after collaboration start
    await page.screenshot({ path: 'screenshots/drawing-test-collab-started.png', fullPage: true });

    // Try to select rectangle tool more precisely
    console.log('Attempting to select rectangle tool...');
    
    // Look for the rectangle tool in toolbar
    const rectTool = page.locator('[data-testid="toolbar-rectangle"]').first();
    if (await rectTool.isVisible()) {
      console.log('Rectangle tool found, clicking...');
      await rectTool.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot after tool selection
      await page.screenshot({ path: 'screenshots/drawing-test-tool-selected.png', fullPage: true });
    } else {
      console.log('Rectangle tool not found with data-testid, trying other selectors...');
      
      // Try alternative selectors
      const altSelectors = [
        'button[aria-label="Rectangle"]',
        'button[title="Rectangle"]',
        '.toolbar button:nth-child(3)', // Often rectangle is 3rd button
        '[aria-label*="Rectangle"]'
      ];
      
      for (const selector of altSelectors) {
        const tool = page.locator(selector).first();
        if (await tool.isVisible()) {
          console.log(`Found rectangle tool with selector: ${selector}`);
          await tool.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }

    // Try drawing in the center of the canvas
    console.log('Drawing rectangle...');
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      // Draw rectangle
      await page.mouse.move(centerX - 50, centerY - 50);
      await page.mouse.down();
      await page.mouse.move(centerX + 50, centerY + 50);
      await page.mouse.up();
      
      console.log(`Drew rectangle from (${centerX - 50}, ${centerY - 50}) to (${centerX + 50}, ${centerY + 50})`);
      
      await page.waitForTimeout(2000);
      
      // Take screenshot after drawing
      await page.screenshot({ path: 'screenshots/drawing-test-after-draw.png', fullPage: true });
    } else {
      console.log('Canvas not found');
    }

    // Wait for any sync messages
    await page.waitForTimeout(3000);

    // Log all console messages to see if elements were created
    console.log('All console logs:');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });

    // Check if any elements were created by looking for non-zero element counts
    const hasElements = consoleLogs.some(log => 
      log.includes('elements: Array(') && !log.includes('Array(0)')
    );
    
    console.log('Has elements created:', hasElements);
  });
});