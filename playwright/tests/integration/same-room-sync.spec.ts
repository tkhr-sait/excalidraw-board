import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Test synchronization when both browsers are in the same room
 */

test.describe('Same Room Sync', () => {
  test('should sync when both browsers join the same room', async ({ browser }) => {
    console.log('Starting same-room sync test...');
    
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Set up console logging for both pages
    const logs1: string[] = [];
    const logs2: string[] = [];
    
    page1.on('console', msg => {
      const log = `Page1: ${msg.text()}`;
      logs1.push(log);
      console.log(log);
    });
    
    page2.on('console', msg => {
      const log = `Page2: ${msg.text()}`;
      logs2.push(log);
      console.log(log);
    });

    try {
      // Navigate both pages
      await Promise.all([
        page1.goto('http://localhost:5174'),
        page2.goto('http://localhost:5174'),
      ]);

      // Wait for both pages to load
      await Promise.all([
        page1.waitForSelector('[data-testid="excalidraw-board"]'),
        page2.waitForSelector('[data-testid="excalidraw-board"]'),
      ]);

      console.log('Both pages loaded');

      // Set the same room ID on both pages by opening settings
      const testRoomId = 'test-room-' + Date.now();
      
      // Open settings on page1 and set room ID
      await page1.click('button:has-text("設定")');
      await page1.fill('[data-testid="room-input"]', testRoomId);
      await page1.click('button:has-text("適用")');
      
      console.log('Set room ID on page1:', testRoomId);
      
      // Open settings on page2 and set the same room ID
      await page2.click('button:has-text("設定")');
      await page2.fill('[data-testid="room-input"]', testRoomId);
      await page2.click('button:has-text("適用")');
      
      console.log('Set room ID on page2:', testRoomId);

      // Start collaboration on both pages
      await page1.click('[data-testid="live-collaboration-trigger"]');
      await page2.click('[data-testid="live-collaboration-trigger"]');
      
      console.log('Collaboration started on both pages');

      // Wait for collaboration to establish
      await page1.waitForTimeout(5000);

      // Verify both pages are in the same room by checking console logs
      const roomLogs1 = logs1.filter(log => log.includes('Joining room:') && log.includes(testRoomId));
      const roomLogs2 = logs2.filter(log => log.includes('Joining room:') && log.includes(testRoomId));
      
      console.log('Room logs page1:', roomLogs1);
      console.log('Room logs page2:', roomLogs2);

      // Check for room user count changes (indicating both users are in the same room)
      const userChangeLogs1 = logs1.filter(log => log.includes('room-user-change') || log.includes('userCount: 2'));
      const userChangeLogs2 = logs2.filter(log => log.includes('room-user-change') || log.includes('userCount: 2'));
      
      console.log('User change logs page1:', userChangeLogs1);
      console.log('User change logs page2:', userChangeLogs2);

      // Create an element on page1
      console.log('Creating element on page1...');
      
      const elementsFromPage1 = await page1.evaluate(() => {
        const api = (window as any).excalidrawAPI;
        if (api) {
          const testElement = {
            id: 'test-rect-' + Date.now(),
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 2,
            roughness: 1,
            opacity: 100,
            angle: 0,
            isDeleted: false,
            version: 1,
            versionNonce: Math.random(),
            groupIds: [],
            boundElements: null,
            updated: Date.now(),
            seed: Math.random(),
            index: 'a0',
            roundness: null,
            locked: false,
            link: null,
            customData: null
          };
          
          console.log('Creating test element:', testElement);
          
          api.updateScene({
            elements: [testElement],
            appState: {},
            commitToHistory: true
          });
          
          return api.getSceneElements();
        }
        return null;
      });

      console.log('Elements created on page1:', elementsFromPage1?.length || 0);

      // Wait for synchronization
      await page1.waitForTimeout(5000);

      // Check elements on page2
      const elementsFromPage2 = await page2.evaluate(() => {
        const api = (window as any).excalidrawAPI;
        if (api) {
          const elements = api.getSceneElements();
          console.log('Elements on page2:', elements);
          return elements;
        }
        return null;
      });

      console.log('Elements on page2:', elementsFromPage2?.length || 0);

      // Check for sync messages between pages
      const syncSent = logs1.filter(log => log.includes('server-broadcast') && log.includes(testRoomId));
      const syncReceived = logs2.filter(log => log.includes('server-broadcast received'));
      
      console.log('Sync messages sent from page1:', syncSent.length);
      console.log('Sync messages received on page2:', syncReceived.length);

      // Take final screenshots
      await page1.screenshot({ path: 'playwright/screenshots/same-room-page1.png' });
      await page2.screenshot({ path: 'playwright/screenshots/same-room-page2.png' });

      // Assertions
      expect(roomLogs1.length).toBeGreaterThan(0);
      expect(roomLogs2.length).toBeGreaterThan(0);
      
      if (elementsFromPage1 && elementsFromPage1.length > 0) {
        expect(elementsFromPage2?.length).toBe(elementsFromPage1.length);
      }

    } finally {
      await context1.close();
      await context2.close();
    }
  });
});