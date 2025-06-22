import { test, expect } from '@playwright/test';
import { CollaborationHelper } from '../helpers/collaboration';
import { BoardPage } from '../pages/BoardPage';
import { testShapes, TestDataManager, testTimeouts } from '../fixtures/test-data';

test.describe('Multi-User Collaboration Tests', () => {
  test('should allow two users to connect to same room', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('two-users');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      // Verify both users are connected
      for (const boardPage of session.boardPages) {
        const status = await boardPage.getConnectionStatus();
        expect(status).toBe('connected');
        
        // Each user should see 2 users total
        await CollaborationHelper.waitForUserCount(boardPage, 2, testTimeouts.connection);
      }
      
      // Take screenshots to verify UI state
      await CollaborationHelper.takeSessionScreenshots(session, 'two-users-connected');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should synchronize drawing between two users', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('draw-sync');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      const [user1Board, user2Board] = session.boardPages;
      
      // Wait for both users to be fully connected
      await CollaborationHelper.waitForUserCount(user1Board, 2);
      await CollaborationHelper.waitForUserCount(user2Board, 2);
      
      // User 1 draws a rectangle
      await user1Board.drawRectangle(
        testShapes.rectangle.x,
        testShapes.rectangle.y,
        testShapes.rectangle.width!,
        testShapes.rectangle.height!
      );
      
      // Wait for synchronization
      await CollaborationHelper.waitForSync(session.boardPages, testTimeouts.sync);
      
      // User 2 draws a circle
      await user2Board.drawCircle(
        testShapes.ellipse.x,
        testShapes.ellipse.y,
        testShapes.ellipse.width! / 2
      );
      
      // Wait for final synchronization
      await CollaborationHelper.waitForSync(session.boardPages, testTimeouts.sync);
      
      // Take screenshots to verify both shapes appear on both clients
      const screenshots = await CollaborationHelper.takeSessionScreenshots(
        session,
        'two-users-drawings'
      );
      
      console.log('Collaboration screenshots taken:', screenshots);
      
      // Verify both users maintain connection during drawing
      for (const boardPage of session.boardPages) {
        const status = await boardPage.getConnectionStatus();
        expect(status).toBe('connected');
        expect(await boardPage.getUserCount()).toBe(2);
      }
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should handle concurrent drawing from multiple users', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('concurrent-draw');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 3);
    
    try {
      // Wait for all users to connect
      for (const boardPage of session.boardPages) {
        await CollaborationHelper.waitForUserCount(boardPage, 3, testTimeouts.connection);
      }
      
      // All three users draw simultaneously at different positions
      await Promise.all([
        session.boardPages[0].drawRectangle(100, 100, 100, 100),
        session.boardPages[1].drawRectangle(250, 100, 100, 100), 
        session.boardPages[2].drawRectangle(400, 100, 100, 100),
      ]);
      
      // Wait for all changes to sync
      await CollaborationHelper.waitForSync(session.boardPages, testTimeouts.sync * 2);
      
      // Verify all users can see all shapes and maintain connection
      for (const boardPage of session.boardPages) {
        const status = await boardPage.getConnectionStatus();
        expect(status).toBe('connected');
        expect(await boardPage.getUserCount()).toBe(3);
      }
      
      // Take final screenshots
      await CollaborationHelper.takeSessionScreenshots(session, 'three-users-concurrent');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should handle user disconnection and reconnection', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('disconnect-test');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      const [user1Board, user2Board] = session.boardPages;
      
      // Verify initial connection
      await CollaborationHelper.waitForUserCount(user1Board, 2);
      await CollaborationHelper.waitForUserCount(user2Board, 2);
      
      // User 1 draws something
      await user1Board.drawRectangle(100, 100, 100, 100);
      await CollaborationHelper.waitForSync(session.boardPages);
      
      // Simulate network disconnection for user 1
      await CollaborationHelper.simulateDisconnection(user1Board.page);
      
      // Wait for user 1 to detect disconnection
      await user1Board.page.waitForTimeout(2000);
      
      // User 2 should see user count drop to 1
      await CollaborationHelper.waitForUserCount(user2Board, 1, testTimeouts.connection);
      
      // User 2 draws while user 1 is disconnected
      await user2Board.drawCircle(300, 100, 50);
      await user2Board.page.waitForTimeout(1000);
      
      // Restore connection for user 1
      await CollaborationHelper.restoreConnection(user1Board.page);
      
      // Wait for reconnection
      await user1Board.waitForConnection(testTimeouts.connection);
      
      // Both users should see 2 users again
      await CollaborationHelper.waitForUserCount(user1Board, 2, testTimeouts.connection);
      await CollaborationHelper.waitForUserCount(user2Board, 2, testTimeouts.connection);
      
      // Wait for sync after reconnection
      await CollaborationHelper.waitForSync(session.boardPages);
      
      // Take final screenshots to verify state after reconnection
      await CollaborationHelper.takeSessionScreenshots(session, 'reconnection-test');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should maintain session when user leaves permanently', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('user-leaves');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 3);
    
    try {
      // Verify all 3 users are connected
      for (const boardPage of session.boardPages) {
        await CollaborationHelper.waitForUserCount(boardPage, 3, testTimeouts.connection);
      }
      
      // All users draw something
      await session.boardPages[0].drawRectangle(100, 100, 80, 80);
      await session.boardPages[1].drawRectangle(200, 100, 80, 80);
      await session.boardPages[2].drawRectangle(300, 100, 80, 80);
      
      await CollaborationHelper.waitForSync(session.boardPages);
      
      // Close one user's context (simulate leaving)
      await session.contexts[1].close();
      
      // Remaining users should see count drop to 2
      await CollaborationHelper.waitForUserCount(session.boardPages[0], 2, testTimeouts.connection);
      await CollaborationHelper.waitForUserCount(session.boardPages[2], 2, testTimeouts.connection);
      
      // Remaining users can still collaborate
      await session.boardPages[0].drawCircle(150, 200, 40);
      await session.boardPages[2].drawCircle(350, 200, 40);
      
      await CollaborationHelper.waitForSync([session.boardPages[0], session.boardPages[2]]);
      
      // Both remaining users should still be connected
      expect(await session.boardPages[0].getConnectionStatus()).toBe('connected');
      expect(await session.boardPages[2].getConnectionStatus()).toBe('connected');
      
      // Take final screenshots
      await Promise.all([
        session.pages[0].screenshot({ 
          path: 'test-results/user-leaves-user1.png',
          fullPage: true 
        }),
        session.pages[2].screenshot({ 
          path: 'test-results/user-leaves-user3.png',
          fullPage: true 
        }),
      ]);
      
    } finally {
      // Cleanup remaining contexts
      for (const context of session.contexts) {
        if (!context.closed) {
          await context.close();
        }
      }
    }
  });

  test('should handle rapid user joins and leaves', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('rapid-changes');
    
    // Start with 2 users
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      await CollaborationHelper.waitForUserCount(session.boardPages[0], 2);
      
      // Add a third user
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      const newBoardPage = new BoardPage(newPage);
      
      await newBoardPage.goto(roomId);
      await newBoardPage.waitForExcalidrawLoad();
      await newBoardPage.waitForConnection();
      
      // All users should see 3 users
      await CollaborationHelper.waitForUserCount(session.boardPages[0], 3);
      await CollaborationHelper.waitForUserCount(session.boardPages[1], 3);
      await CollaborationHelper.waitForUserCount(newBoardPage, 3);
      
      // Quickly remove the new user
      await newContext.close();
      
      // Original users should see count drop back to 2
      await CollaborationHelper.waitForUserCount(session.boardPages[0], 2, testTimeouts.connection);
      await CollaborationHelper.waitForUserCount(session.boardPages[1], 2, testTimeouts.connection);
      
      // Original session should still work
      await session.boardPages[0].drawRectangle(100, 100, 100, 100);
      await CollaborationHelper.waitForSync(session.boardPages);
      
      expect(await session.boardPages[0].getConnectionStatus()).toBe('connected');
      expect(await session.boardPages[1].getConnectionStatus()).toBe('connected');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should synchronize complex drawing sequences', async ({ browser }) => {
    const roomId = TestDataManager.getCleanRoomId('complex-sync');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      const [user1Board, user2Board] = session.boardPages;
      
      await CollaborationHelper.waitForUserCount(user1Board, 2);
      await CollaborationHelper.waitForUserCount(user2Board, 2);
      
      // User 1 creates multiple shapes in sequence
      await user1Board.drawRectangle(100, 100, 80, 80);
      await user1Board.page.waitForTimeout(500);
      
      await user1Board.drawRectangle(200, 100, 80, 80);
      await user1Board.page.waitForTimeout(500);
      
      await user1Board.drawCircle(150, 200, 40);
      await user1Board.page.waitForTimeout(500);
      
      // User 2 creates shapes in different area
      await user2Board.drawRectangle(400, 100, 80, 80);
      await user2Board.page.waitForTimeout(500);
      
      await user2Board.drawCircle(440, 200, 40);
      await user2Board.page.waitForTimeout(500);
      
      // Wait for all changes to sync
      await CollaborationHelper.waitForSync(session.boardPages, testTimeouts.sync * 2);
      
      // Take final screenshots
      await CollaborationHelper.takeSessionScreenshots(session, 'complex-sequence');
      
      // Verify both users maintain connection throughout
      expect(await user1Board.getConnectionStatus()).toBe('connected');
      expect(await user2Board.getConnectionStatus()).toBe('connected');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test.afterAll(async () => {
    TestDataManager.cleanup();
  });
});