import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Two-browser synchronization test - simplified
 */

test.describe('Two Browser Sync', () => {
  test('should sync between two browsers', async ({ browser }) => {
    console.log('Starting two-browser sync test...');
    
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

      // Start collaboration on both pages
      await page1.click('[data-testid="live-collaboration-trigger"]');
      await page2.click('[data-testid="live-collaboration-trigger"]');
      
      console.log('Collaboration started on both pages');

      // Wait for collaboration to establish
      await page1.waitForTimeout(5000);

      // Take screenshots
      await page1.screenshot({ path: 'playwright/screenshots/page1-collab.png' });
      await page2.screenshot({ path: 'playwright/screenshots/page2-collab.png' });

      // Check for collaboration messages in both pages
      const collabLogs1 = logs1.filter(log => 
        log.includes('server-broadcast') || 
        log.includes('Joining room') ||
        log.includes('room-user-change')
      );
      
      const collabLogs2 = logs2.filter(log => 
        log.includes('server-broadcast') || 
        log.includes('Joining room') ||
        log.includes('room-user-change')
      );

      console.log('Collaboration logs Page1:', collabLogs1.length);
      console.log('Collaboration logs Page2:', collabLogs2.length);

      // Try to simulate drawing by calling the API directly
      console.log('Simulating drawing on page1...');
      
      const elementsFromPage1 = await page1.evaluate(() => {
        const api = (window as any).excalidrawAPI;
        if (api) {
          // Create a test rectangle element
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
          
          // Update the scene with the new element
          api.updateScene({
            elements: [testElement],
            appState: {},
            commitToHistory: true
          });
          
          // Return the current elements
          return api.getSceneElements();
        }
        return null;
      });

      console.log('Elements created on page1:', elementsFromPage1?.length || 0);

      // Wait for synchronization
      await page1.waitForTimeout(3000);

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

      // Take final screenshots
      await page1.screenshot({ path: 'playwright/screenshots/page1-final.png' });
      await page2.screenshot({ path: 'playwright/screenshots/page2-final.png' });

      // Print sync logs for debugging
      const syncLogs1 = logs1.filter(log => 
        log.includes('syncElements') || 
        log.includes('Sending scene update') ||
        log.includes('server-broadcast')
      );
      
      const syncLogs2 = logs2.filter(log => 
        log.includes('received message') || 
        log.includes('Processing collaboration') ||
        log.includes('Merged elements')
      );

      console.log('Sync logs Page1 (sending):', syncLogs1);
      console.log('Sync logs Page2 (receiving):', syncLogs2);

      // Basic assertions
      expect(collabLogs1.length).toBeGreaterThan(0);
      expect(collabLogs2.length).toBeGreaterThan(0);
      
      if (elementsFromPage1 && elementsFromPage1.length > 0) {
        expect(elementsFromPage2?.length).toBe(elementsFromPage1.length);
      }

    } finally {
      await context1.close();
      await context2.close();
    }
  });
});