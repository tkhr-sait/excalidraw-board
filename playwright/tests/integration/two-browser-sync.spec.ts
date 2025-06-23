import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('Two Browser Sync', () => {
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

  test('should sync messages between two browsers', async () => {
    console.log('Starting two browser sync test...');

    // Navigate both pages
    await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Setup console logging
    const page1Logs: string[] = [];
    const page2Logs: string[] = [];
    
    page1.on('console', msg => {
      const text = msg.text();
      page1Logs.push(`Page1: ${text}`);
      console.log(`Page1: ${text}`);
    });
    
    page2.on('console', msg => {
      const text = msg.text();
      page2Logs.push(`Page2: ${text}`);
      console.log(`Page2: ${text}`);
    });

    // Use same room name for both
    const roomName = 'sync-test-' + Date.now();

    // Start collaboration on page1
    console.log('Starting collaboration on page1...');
    await startCollaboration(page1, roomName, 'User1');
    await page1.waitForTimeout(3000);

    // Start collaboration on page2  
    console.log('Starting collaboration on page2...');
    await startCollaboration(page2, roomName, 'User2');
    await page2.waitForTimeout(3000);

    // Take screenshots
    await page1.screenshot({ path: 'screenshots/two-browser-page1-ready.png', fullPage: true });
    await page2.screenshot({ path: 'screenshots/two-browser-page2-ready.png', fullPage: true });

    // Draw on page1
    console.log('Drawing on page1...');
    await page1.keyboard.press('r'); // Select rectangle
    await page1.waitForTimeout(500);
    await page1.mouse.move(400, 300);
    await page1.mouse.down();
    await page1.mouse.move(500, 400);
    await page1.mouse.up();
    await page1.waitForTimeout(3000);

    await page1.screenshot({ path: 'screenshots/two-browser-page1-drew.png', fullPage: true });
    await page2.screenshot({ path: 'screenshots/two-browser-page2-after-sync.png', fullPage: true });

    // Check logs for received messages
    console.log('Checking for received messages...');
    
    const page1SentSync = page1Logs.filter(log => log.includes('Socket.IO sending message: sync'));
    const page2ReceivedBroadcast = page2Logs.filter(log => 
      log.includes('server-broadcast') || 
      log.includes('client-broadcast') ||
      log.includes('Processing')
    );

    console.log('Page1 sent sync messages:', page1SentSync.length);
    console.log('Page2 received broadcast messages:', page2ReceivedBroadcast.length);

    // Log recent messages for analysis
    console.log('\nPage1 recent logs:');
    page1Logs.slice(-10).forEach(log => console.log('  ', log));
    
    console.log('\nPage2 recent logs:');
    page2Logs.slice(-10).forEach(log => console.log('  ', log));

    // Check if Page2 received any messages from Page1
    const hasReceivedMessages = page2ReceivedBroadcast.length > 0;
    console.log('Page2 received messages from Page1:', hasReceivedMessages);
  });

  async function startCollaboration(page: Page, roomName: string, userName: string) {
    // Click settings
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

      // Apply
      const applyButton = page.getByText('適用');
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(2000);
      }
    } else {
      // Direct start
      const collabStart = page.getByText('コラボ開始');
      if (await collabStart.isVisible()) {
        await collabStart.click();
        await page.waitForTimeout(2000);
      }
    }
  }
});