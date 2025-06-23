import { test, expect } from '@playwright/test';

/**
 * Test room joining functionality
 */

test.describe('Room Join Test', () => {
  test('should join room correctly with room ID', async ({ page }) => {
    console.log('Testing room join...');
    
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
    await page.waitForTimeout(5000);

    // Check for room joining logs
    const roomLogs = consoleLogs.filter(log => 
      log.includes('Joining room') ||
      log.includes('init-room') ||
      log.includes('room:') ||
      log.includes('roomId')
    );

    console.log('Room-related logs:', roomLogs);

    // Check for server-broadcast logs with non-null room
    const broadcastLogs = consoleLogs.filter(log => 
      log.includes('server-broadcast') && 
      !log.includes('room: null')
    );

    console.log('Broadcast logs with room ID:', broadcastLogs);

    // Draw something to trigger sync
    console.log('Triggering drawing to test sync...');
    
    // Try to click somewhere on the canvas to trigger a change
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Wait for sync messages
    await page.waitForTimeout(2000);

    // Check for sync messages after drawing
    const finalSyncLogs = consoleLogs.filter(log => 
      log.includes('Sending scene update') ||
      log.includes('server-broadcast')
    );

    console.log('Final sync logs:', finalSyncLogs);

    // Print all logs for debugging
    console.log('=== ALL LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    // Assertions
    expect(roomLogs.length).toBeGreaterThan(0);
    expect(broadcastLogs.length).toBeGreaterThan(0);
  });
});