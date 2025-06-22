import { test, expect } from '@playwright/test';
import { BoardPage } from '../pages/BoardPage';
import { CollaborationHelper } from '../helpers/collaboration';
import { performanceTestData, TestDataManager, testTimeouts } from '../fixtures/test-data';

test.describe('Performance Tests', () => {
  test('should handle large number of elements efficiently', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('large-elements');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    const startTime = Date.now();
    
    // Generate performance test shapes
    const shapes = performanceTestData.generateShapes(performanceTestData.mediumLoad.shapeCount);
    
    // Draw all shapes
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      
      if (shape.type === 'rectangle') {
        await boardPage.drawRectangle(shape.x, shape.y, shape.width!, shape.height!);
      } else if (shape.type === 'ellipse') {
        await boardPage.drawCircle(shape.x, shape.y, shape.width! / 2);
      }
      
      // Add minimal delay to prevent overwhelming the system
      if (i % 5 === 0) {
        await page.waitForTimeout(50);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Drew ${shapes.length} shapes in ${duration}ms`);
    
    // Performance assertions
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    
    // Verify connection is maintained throughout
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Test responsiveness after drawing many elements
    await boardPage.clickCanvas(400, 400);
    
    // Measure memory usage
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (memoryUsage) {
      console.log('Memory usage after drawing:', {
        usedJSHeapSize: `${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB`,
        totalJSHeapSize: `${Math.round(memoryUsage.totalJSHeapSize / 1024 / 1024)}MB`,
        jsHeapSizeLimit: `${Math.round(memoryUsage.jsHeapSizeLimit / 1024 / 1024)}MB`,
      });
    }
    
    // Take screenshot to verify rendering
    await expect(page).toHaveScreenshot('performance-large-elements.png');
  });

  test('should handle multiple users with heavy load', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('multi-user-load');
    const userCount = performanceTestData.mediumLoad.userCount;
    
    const session = await CollaborationHelper.createSession(browser, roomId, userCount);
    
    try {
      // Wait for all users to connect
      for (const boardPage of session.boardPages) {
        await CollaborationHelper.waitForUserCount(boardPage, userCount, testTimeouts.connection);
      }
      
      const startTime = Date.now();
      
      // Each user draws shapes simultaneously
      const drawingPromises = session.boardPages.map(async (boardPage, userIndex) => {
        const shapesPerUser = 15;
        
        for (let i = 0; i < shapesPerUser; i++) {
          const x = (userIndex * 200) + (i % 5) * 40 + 50;
          const y = Math.floor(i / 5) * 40 + 50;
          
          if (i % 2 === 0) {
            await boardPage.drawRectangle(x, y, 30, 30);
          } else {
            await boardPage.drawCircle(x, y, 15);
          }
          
          // Small delay to prevent race conditions
          await boardPage.page.waitForTimeout(100);
        }
      });
      
      // Wait for all users to complete drawing
      await Promise.all(drawingPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`${userCount} users drew shapes concurrently in ${duration}ms`);
      
      // Wait for synchronization
      await CollaborationHelper.waitForSync(session.boardPages, testTimeouts.sync * 3);
      
      // Performance assertions
      expect(duration).toBeLessThan(45000); // Should complete within 45 seconds
      
      // Verify all users maintain connection
      for (const boardPage of session.boardPages) {
        expect(await boardPage.getConnectionStatus()).toBe('connected');
        expect(await boardPage.getUserCount()).toBe(userCount);
      }
      
      // Take screenshots from each user's perspective
      await CollaborationHelper.takeSessionScreenshots(session, 'multi-user-performance');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should measure drawing response times', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('response-times');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    const responseTimes: number[] = [];
    const testCount = 10;
    
    for (let i = 0; i < testCount; i++) {
      const startTime = performance.now();
      
      // Draw a shape and measure response time
      await boardPage.drawRectangle(
        i * 60 + 50,
        100,
        50,
        50
      );
      
      // Wait for the shape to be rendered
      await page.waitForTimeout(100);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
      
      console.log(`Draw operation ${i + 1} took ${responseTime.toFixed(2)}ms`);
    }
    
    // Calculate statistics
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    console.log('Response time statistics:', {
      average: `${avgResponseTime.toFixed(2)}ms`,
      max: `${maxResponseTime.toFixed(2)}ms`,
      min: `${minResponseTime.toFixed(2)}ms`,
    });
    
    // Performance assertions
    expect(avgResponseTime).toBeLessThan(1000); // Average should be under 1 second
    expect(maxResponseTime).toBeLessThan(3000); // Max should be under 3 seconds
    
    // Verify final state
    expect(await boardPage.getConnectionStatus()).toBe('connected');
  });

  test('should handle rapid consecutive operations', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('rapid-operations');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    const startTime = Date.now();
    const operationCount = 20;
    
    // Perform rapid consecutive drawing operations
    for (let i = 0; i < operationCount; i++) {
      const x = (i % 10) * 50 + 50;
      const y = Math.floor(i / 10) * 50 + 50;
      
      // Alternate between rectangles and circles
      if (i % 2 === 0) {
        await boardPage.drawRectangle(x, y, 40, 40);
      } else {
        await boardPage.drawCircle(x, y, 20);
      }
      
      // No delay between operations to test rapid execution
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Completed ${operationCount} rapid operations in ${duration}ms`);
    
    // Performance assertions
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    
    // System should remain responsive
    expect(await boardPage.getConnectionStatus()).toBe('connected');
    
    // Should be able to perform additional operations
    await boardPage.clickCanvas(300, 300);
  });

  test('should measure WebSocket message throughput', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('message-throughput');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      const [user1Board, user2Board] = session.boardPages;
      
      await CollaborationHelper.waitForUserCount(user1Board, 2);
      
      // Track WebSocket messages
      const messagesSent: number[] = [];
      const messagesReceived: number[] = [];
      
      await user1Board.page.addInitScript(() => {
        const originalSend = WebSocket.prototype.send;
        WebSocket.prototype.send = function(data) {
          (window as any).messagesSent = ((window as any).messagesSent || 0) + 1;
          return originalSend.call(this, data);
        };
        
        const originalAddEventListener = WebSocket.prototype.addEventListener;
        WebSocket.prototype.addEventListener = function(type, listener, options) {
          if (type === 'message') {
            const wrappedListener = (event: MessageEvent) => {
              (window as any).messagesReceived = ((window as any).messagesReceived || 0) + 1;
              listener(event);
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      });
      
      const startTime = Date.now();
      
      // User 1 performs many operations to generate messages
      for (let i = 0; i < 20; i++) {
        await user1Board.drawRectangle(i * 30 + 50, 100, 25, 25);
        await user1Board.page.waitForTimeout(50);
      }
      
      // Wait for synchronization
      await CollaborationHelper.waitForSync(session.boardPages, testTimeouts.sync);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Get message counts
      const sentCount = await user1Board.page.evaluate(() => (window as any).messagesSent || 0);
      const receivedCount = await user2Board.page.evaluate(() => (window as any).messagesReceived || 0);
      
      console.log('WebSocket throughput:', {
        duration: `${duration}ms`,
        messagesSent: sentCount,
        messagesReceived: receivedCount,
        messagesPerSecond: Math.round((sentCount / duration) * 1000),
      });
      
      // Verify messages were exchanged
      expect(sentCount).toBeGreaterThan(0);
      expect(receivedCount).toBeGreaterThan(0);
      
      // Both users should maintain connection
      expect(await user1Board.getConnectionStatus()).toBe('connected');
      expect(await user2Board.getConnectionStatus()).toBe('connected');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should handle browser resource constraints', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('resource-constraints');
    const boardPage = new BoardPage(page);
    
    // Simulate limited CPU by throttling
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    
    try {
      await boardPage.goto(roomId);
      await boardPage.waitForExcalidrawLoad();
      await boardPage.waitForConnection();
      
      const startTime = Date.now();
      
      // Perform operations under CPU throttling
      for (let i = 0; i < 10; i++) {
        await boardPage.drawRectangle(i * 60 + 50, 100, 50, 50);
        await page.waitForTimeout(200);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Operations under CPU throttling took ${duration}ms`);
      
      // Should still complete within reasonable time
      expect(duration).toBeLessThan(20000);
      
      // Connection should be maintained
      expect(await boardPage.getConnectionStatus()).toBe('connected');
      
    } finally {
      // Remove CPU throttling
      await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await cdpSession.detach();
    }
  });

  test('should monitor memory leaks during extended use', async ({ page }) => {
    const roomId = TestDataManager.getCleanRoomId('memory-leak');
    const boardPage = new BoardPage(page);
    
    await boardPage.goto(roomId);
    await boardPage.waitForExcalidrawLoad();
    await boardPage.waitForConnection();
    
    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Perform many operations
    for (let cycle = 0; cycle < 5; cycle++) {
      // Draw shapes
      for (let i = 0; i < 10; i++) {
        await boardPage.drawRectangle(
          (cycle * 100) + (i * 20) + 50,
          100,
          15,
          15
        );
      }
      
      // Clear canvas periodically to test cleanup
      if (cycle % 2 === 1) {
        // Select all and delete (simulate cleanup)
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(500);
      }
      
      await page.waitForTimeout(1000);
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      console.log('Memory usage:', {
        initial: `${Math.round(initialMemory / 1024 / 1024)}MB`,
        final: `${Math.round(finalMemory / 1024 / 1024)}MB`,
        increase: `${Math.round(memoryIncrease / 1024 / 1024)}MB`,
        increasePercent: `${memoryIncreasePercent.toFixed(2)}%`,
      });
      
      // Memory increase should be reasonable (less than 100% increase)
      expect(memoryIncreasePercent).toBeLessThan(100);
    }
    
    // Application should still be responsive
    expect(await boardPage.getConnectionStatus()).toBe('connected');
  });

  test.afterAll(async () => {
    TestDataManager.cleanup();
  });
});