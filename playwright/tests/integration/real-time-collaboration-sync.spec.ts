import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Real-time collaboration synchronization test
 * Tests that shape drawing is synchronized between two browsers
 */

let browser1: BrowserContext;
let browser2: BrowserContext;
let page1: Page;
let page2: Page;

test.describe('Real-time Collaboration Synchronization', () => {
  test.beforeAll(async ({ browser }) => {
    // Create two separate browser contexts to simulate different users
    browser1 = await browser.newContext();
    browser2 = await browser.newContext();
    
    page1 = await browser1.newPage();
    page2 = await browser2.newPage();
  });

  test.afterAll(async () => {
    await browser1.close();
    await browser2.close();
  });

  test('should synchronize shape drawing between two browsers', async () => {
    console.log('Starting real-time collaboration sync test...');
    
    // Navigate both pages to the application
    await Promise.all([
      page1.goto('http://localhost:5174'),
      page2.goto('http://localhost:5174'),
    ]);

    // Wait for both pages to load
    await Promise.all([
      page1.waitForSelector('[data-testid="excalidraw-board"]'),
      page2.waitForSelector('[data-testid="excalidraw-board"]'),
    ]);

    console.log('Both pages loaded successfully');

    // Set up console logging for both pages
    const consoleLogs1: string[] = [];
    const consoleLogs2: string[] = [];
    
    page1.on('console', msg => {
      const logMsg = `Page1: ${msg.type()}: ${msg.text()}`;
      consoleLogs1.push(logMsg);
      console.log(logMsg);
    });
    
    page2.on('console', msg => {
      const logMsg = `Page2: ${msg.type()}: ${msg.text()}`;
      consoleLogs2.push(logMsg);
      console.log(logMsg);
    });

    // Start collaboration on both pages using LiveCollaborationTrigger
    await page1.click('[data-testid="live-collaboration-trigger"]');
    await page2.click('[data-testid="live-collaboration-trigger"]');
    
    console.log('Clicked collaboration triggers on both pages');

    // Wait for collaboration to start
    await page1.waitForTimeout(2000);
    
    // Take initial screenshots
    await page1.screenshot({ path: 'playwright/screenshots/collab-page1-initial.png' });
    await page2.screenshot({ path: 'playwright/screenshots/collab-page2-initial.png' });

    // Draw a rectangle on page1
    console.log('Drawing rectangle on page1...');
    
    // Click rectangle tool
    await page1.click('[data-testid="rectangle"]');
    
    // Draw rectangle by dragging
    const canvas1 = page1.locator('canvas').first();
    await canvas1.dragTo(canvas1, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 200 }
    });
    
    console.log('Rectangle drawn on page1');
    
    // Wait for synchronization
    await page1.waitForTimeout(3000);
    
    // Take screenshots after drawing
    await page1.screenshot({ path: 'playwright/screenshots/collab-page1-after-draw.png' });
    await page2.screenshot({ path: 'playwright/screenshots/collab-page2-after-sync.png' });

    // Check if elements are synchronized by examining console logs
    const syncLogs1 = consoleLogs1.filter(log => 
      log.includes('syncElements') || 
      log.includes('Sending') || 
      log.includes('Scene update')
    );
    
    const syncLogs2 = consoleLogs2.filter(log => 
      log.includes('received') || 
      log.includes('Processing') || 
      log.includes('Merged elements')
    );

    console.log('Sync logs from page1:', syncLogs1);
    console.log('Sync logs from page2:', syncLogs2);

    // Check if page1 sent sync messages
    expect(syncLogs1.length).toBeGreaterThan(0);
    
    // Check if page2 received sync messages  
    expect(syncLogs2.length).toBeGreaterThan(0);

    // Verify that both pages have elements
    const elements1 = await page1.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements() : [];
    });
    
    const elements2 = await page2.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements() : [];
    });

    console.log('Elements on page1:', elements1.length);
    console.log('Elements on page2:', elements2.length);

    // Both pages should have at least one element (the rectangle)
    expect(elements1.length).toBeGreaterThan(0);
    expect(elements2.length).toBeGreaterThan(0);
    
    // Elements should be synchronized (same count)
    expect(elements1.length).toBe(elements2.length);

    // Test reverse synchronization - draw on page2
    console.log('Testing reverse sync - drawing circle on page2...');
    
    // Click ellipse tool on page2
    await page2.click('[data-testid="ellipse"]');
    
    // Draw ellipse
    const canvas2 = page2.locator('canvas').first();
    await canvas2.dragTo(canvas2, {
      sourcePosition: { x: 300, y: 100 },
      targetPosition: { x: 400, y: 200 }
    });
    
    // Wait for synchronization
    await page2.waitForTimeout(3000);
    
    // Take final screenshots
    await page1.screenshot({ path: 'playwright/screenshots/collab-page1-final.png' });
    await page2.screenshot({ path: 'playwright/screenshots/collab-page2-final.png' });

    // Check final element counts
    const finalElements1 = await page1.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements() : [];
    });
    
    const finalElements2 = await page2.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements() : [];
    });

    console.log('Final elements on page1:', finalElements1.length);
    console.log('Final elements on page2:', finalElements2.length);

    // Both pages should have 2 elements (rectangle + ellipse)
    expect(finalElements1.length).toBe(2);
    expect(finalElements2.length).toBe(2);
    
    // Save console logs for debugging
    await page1.evaluate((logs) => {
      console.log('=== COLLABORATION SYNC LOGS PAGE1 ===');
      logs.forEach(log => console.log(log));
    }, consoleLogs1);
    
    await page2.evaluate((logs) => {
      console.log('=== COLLABORATION SYNC LOGS PAGE2 ===');
      logs.forEach(log => console.log(log));
    }, consoleLogs2);
  });

  test('should handle WebSocket connection properly', async () => {
    // Navigate to the application
    await page1.goto('http://localhost:5174');
    await page1.waitForSelector('[data-testid="excalidraw-board"]');

    // Monitor WebSocket connections
    const wsConnections: any[] = [];
    page1.on('websocket', ws => {
      console.log('WebSocket created:', ws.url());
      wsConnections.push(ws);
      
      ws.on('framesent', event => {
        console.log('WebSocket frame sent:', event.payload);
      });
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload);
      });
    });

    // Start collaboration
    await page1.click('[data-testid="live-collaboration-trigger"]');
    
    // Wait for WebSocket connection
    await page1.waitForTimeout(2000);
    
    // Check if WebSocket connection was established
    expect(wsConnections.length).toBeGreaterThan(0);
    
    console.log('WebSocket connections established:', wsConnections.length);
  });
});