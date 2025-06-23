import { test, expect, Page } from '@playwright/test';

/**
 * Simple collaboration test to debug synchronization issues
 */

test.describe('Simple Collaboration Test', () => {
  test('should start collaboration and check console logs', async ({ page }) => {
    console.log('Starting simple collaboration test...');
    
    // Set up console logging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const logMsg = `${msg.type()}: ${msg.text()}`;
      consoleLogs.push(logMsg);
      console.log('Console:', logMsg);
    });

    // Navigate to the application
    await page.goto('http://localhost:5174');
    await page.waitForSelector('[data-testid="excalidraw-board"]');
    
    console.log('Page loaded, starting collaboration...');

    // Click the LiveCollaborationTrigger
    await page.click('[data-testid="live-collaboration-trigger"]');
    
    console.log('Clicked collaboration trigger');

    // Wait for collaboration to start
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'playwright/screenshots/collaboration-started.png' });

    // Check if collaboration started by looking for relevant console logs
    const collaborationLogs = consoleLogs.filter(log => 
      log.includes('startCollaboration') ||
      log.includes('Joining room') ||
      log.includes('WebSocket') ||
      log.includes('connected') ||
      log.includes('collaboration')
    );

    console.log('Collaboration-related logs:', collaborationLogs);

    // Draw a rectangle
    console.log('Drawing rectangle...');
    
    // Click rectangle tool
    await page.click('[data-testid="toolbar-rectangle"]');
    
    // Draw on canvas
    const canvas = page.locator('canvas').first();
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 200 }
    });
    
    console.log('Rectangle drawn');

    // Wait for potential synchronization
    await page.waitForTimeout(2000);

    // Check for synchronization logs
    const syncLogs = consoleLogs.filter(log => 
      log.includes('syncElements') ||
      log.includes('handleChange') ||
      log.includes('Sending') ||
      log.includes('Scene update') ||
      log.includes('elements')
    );

    console.log('Synchronization logs:', syncLogs);

    // Check if elements were created
    const elements = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      if (api) {
        const sceneElements = api.getSceneElements();
        console.log('Elements from API:', sceneElements);
        return sceneElements;
      }
      return null;
    });

    console.log('Elements count:', elements ? elements.length : 'API not available');

    // Take final screenshot
    await page.screenshot({ path: 'playwright/screenshots/after-drawing.png' });

    // Print all logs for debugging
    console.log('=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    // Basic assertions
    expect(collaborationLogs.length).toBeGreaterThan(0);
    expect(syncLogs.length).toBeGreaterThan(0);
  });

  test('should check WebSocket connection', async ({ page }) => {
    console.log('Testing WebSocket connection...');

    // Monitor WebSocket connections
    const wsConnections: any[] = [];
    page.on('websocket', ws => {
      console.log('WebSocket created:', ws.url());
      wsConnections.push(ws);
      
      ws.on('framesent', event => {
        console.log('WebSocket frame sent:', event.payload);
      });
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload);
      });
      
      ws.on('close', () => {
        console.log('WebSocket closed');
      });
    });

    // Navigate to the application
    await page.goto('http://localhost:5174');
    await page.waitForSelector('[data-testid="excalidraw-board"]');

    // Start collaboration
    await page.click('[data-testid="live-collaboration-trigger"]');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(5000);
    
    console.log('WebSocket connections:', wsConnections.length);
    
    if (wsConnections.length > 0) {
      console.log('WebSocket URL:', wsConnections[0].url());
    }

    // Try to send a test message if WebSocket is connected
    if (wsConnections.length > 0) {
      console.log('WebSocket connected successfully');
    } else {
      console.log('No WebSocket connections found');
    }
  });
});