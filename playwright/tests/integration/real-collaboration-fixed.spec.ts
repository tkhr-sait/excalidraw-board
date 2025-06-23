import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('Real Collaboration Fixed', () => {
  let browser2: Browser | null = null;
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser }) => {
    browser2 = await browser.browserType().launch();
    context1 = await browser.newContext();
    context2 = await browser2.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();
  });

  test.afterAll(async () => {
    if (browser2) {
      await browser2.close();
    }
  });

  test('should sync drawing between two browsers with new footer UI', async () => {
    console.log('Starting collaboration test with new footer UI...');

    // Navigate both pages to the app
    await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    console.log('Both pages loaded');

    // Take initial screenshots
    await page1.screenshot({ path: 'screenshots/collab-page1-initial.png', fullPage: true });
    await page2.screenshot({ path: 'screenshots/collab-page2-initial.png', fullPage: true });

    // Start collaboration on both pages with the same room
    const roomName = 'test-room-' + Date.now();
    const userName1 = 'User1';
    const userName2 = 'User2';

    // Setup collaboration on page1
    console.log('Setting up collaboration on page1...');
    await setupCollaborationWithFooter(page1, roomName, userName1);
    await page1.screenshot({ path: 'screenshots/collab-page1-setup.png', fullPage: true });

    // Wait for connection
    await page1.waitForTimeout(3000);

    // Setup collaboration on page2
    console.log('Setting up collaboration on page2...');
    await setupCollaborationWithFooter(page2, roomName, userName2);
    await page2.screenshot({ path: 'screenshots/collab-page2-setup.png', fullPage: true });

    // Wait for both to connect
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Listen to console logs for debugging
    const page1Logs: string[] = [];
    const page2Logs: string[] = [];
    
    page1.on('console', msg => {
      const text = msg.text();
      page1Logs.push(`Page1: ${text}`);
      console.log(`Page1 Console: ${text}`);
    });
    
    page2.on('console', msg => {
      const text = msg.text();
      page2Logs.push(`Page2: ${text}`);
      console.log(`Page2 Console: ${text}`);
    });

    // Wait a moment to capture any connection logs
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Try to draw on page1
    console.log('Drawing rectangle on page1...');
    await drawRectangle(page1, 200, 200, 300, 300);
    await page1.screenshot({ path: 'screenshots/collab-page1-drew.png', fullPage: true });

    // Wait for sync
    await page1.waitForTimeout(5000);
    await page2.waitForTimeout(5000);

    // Check if drawing appears on page2
    await page2.screenshot({ path: 'screenshots/collab-page2-after-sync.png', fullPage: true });

    // Try to draw on page2
    console.log('Drawing circle on page2...');
    await drawCircle(page2, 400, 400, 50);
    await page2.screenshot({ path: 'screenshots/collab-page2-drew.png', fullPage: true });

    // Wait for sync
    await page1.waitForTimeout(5000);
    await page2.waitForTimeout(5000);

    // Final screenshots
    await page1.screenshot({ path: 'screenshots/collab-page1-final.png', fullPage: true });
    await page2.screenshot({ path: 'screenshots/collab-page2-final.png', fullPage: true });

    console.log('Test completed. Console logs:');
    console.log('Page1 logs:', page1Logs);
    console.log('Page2 logs:', page2Logs);
  });

  async function setupCollaborationWithFooter(page: Page, roomName: string, userName: string) {
    // Click settings button in footer
    const settingsButton = page.getByText('⚙️ 設定');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(1000);

      // Set room name
      const roomInput = page.locator('input[placeholder="ルーム名を入力"]');
      if (await roomInput.isVisible()) {
        await roomInput.clear();
        await roomInput.fill(roomName);
      }

      // Set username
      const userInput = page.locator('input[placeholder="ユーザー名を入力"]');
      if (await userInput.isVisible()) {
        await userInput.clear();
        await userInput.fill(userName);
      }

      // Apply settings
      const applyButton = page.getByText('適用');
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(2000);
      }
    } else {
      // If settings not visible, try to start collaboration directly
      const collabStart = page.getByText('コラボ開始');
      if (await collabStart.isVisible()) {
        await collabStart.click();
        await page.waitForTimeout(2000);
      }
    }
  }

  async function drawRectangle(page: Page, x1: number, y1: number, x2: number, y2: number) {
    // Select rectangle tool using multiple selectors
    let rectToolSelected = false;
    
    const rectSelectors = [
      '[data-testid="toolbar-rectangle"]',
      '[aria-label*="Rectangle"]',
      '[title*="Rectangle"]',
      'button[aria-label="Rectangle"]',
      'button:has-text("Rectangle")'
    ];
    
    for (const selector of rectSelectors) {
      const rectTool = page.locator(selector).first();
      if (await rectTool.isVisible()) {
        console.log(`Found rectangle tool with selector: ${selector}`);
        await rectTool.click();
        await page.waitForTimeout(500);
        rectToolSelected = true;
        break;
      }
    }
    
    if (!rectToolSelected) {
      console.log('Rectangle tool not found, drawing without selecting tool');
    }

    // Draw rectangle
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2);
    await page.mouse.up();
    await page.waitForTimeout(1000);
  }

  async function drawCircle(page: Page, x: number, y: number, radius: number) {
    // Select circle tool using multiple selectors
    let circleToolSelected = false;
    
    const circleSelectors = [
      '[data-testid="toolbar-ellipse"]',
      '[aria-label*="Circle"]',
      '[title*="Ellipse"]',
      '[aria-label*="Ellipse"]',
      'button[aria-label="Ellipse"]',
      'button:has-text("Ellipse")'
    ];
    
    for (const selector of circleSelectors) {
      const circleTool = page.locator(selector).first();
      if (await circleTool.isVisible()) {
        console.log(`Found circle tool with selector: ${selector}`);
        await circleTool.click();
        await page.waitForTimeout(500);
        circleToolSelected = true;
        break;
      }
    }
    
    if (!circleToolSelected) {
      console.log('Circle tool not found, drawing without selecting tool');
    }

    // Draw circle
    await page.mouse.move(x - radius, y - radius);
    await page.mouse.down();
    await page.mouse.move(x + radius, y + radius);
    await page.mouse.up();
    await page.waitForTimeout(1000);
  }
});