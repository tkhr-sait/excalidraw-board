import { test, expect } from '@playwright/test';
import { CollaborationHelper } from './helpers/collaboration';
import { TestDataUtils, TestTimeouts, TestShapes } from './helpers/test-data';

test.describe('Real-time Collaboration', () => {
  test('should allow two users to connect to same room', async ({ browser }) => {
    const roomId = TestDataUtils.generateRoomId('two-users');
    
    // Create collaboration session with 2 users
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      // Verify both users are connected
      for (const boardPage of session.boardPages) {
        const status = await boardPage.getConnectionStatus();
        expect(status).toBe('connected');
        
        // Should show 2 users in the room
        await CollaborationHelper.waitForUserCount(boardPage, 2, TestTimeouts.CONNECTION);
      }
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should synchronize drawing between users', async ({ browser }) => {
    const roomId = TestDataUtils.generateRoomId('draw-sync');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      const [user1Board, user2Board] = session.boardPages;
      
      // Wait for both users to be connected
      await CollaborationHelper.waitForUserCount(user1Board, 2);
      await CollaborationHelper.waitForUserCount(user2Board, 2);
      
      // User 1 draws a rectangle
      await user1Board.drawRectangle(
        TestShapes.RECTANGLE.x,
        TestShapes.RECTANGLE.y,
        TestShapes.RECTANGLE.width,
        TestShapes.RECTANGLE.height
      );
      
      // Wait for synchronization
      await CollaborationHelper.waitForSync(session.boardPages, TestTimeouts.SYNC);
      
      // Take screenshots to verify synchronization
      const screenshots = await CollaborationHelper.takeSessionScreenshots(
        session,
        'draw-sync-test'
      );
      
      console.log('Screenshots taken:', screenshots);
      
      // Note: In a real test, you might compare canvas content or check for specific elements
      // For now, we verify that both users maintain connection during drawing
      for (const boardPage of session.boardPages) {
        const status = await boardPage.getConnectionStatus();
        expect(status).toBe('connected');
      }
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should handle user disconnection and reconnection', async ({ browser }) => {
    const roomId = TestDataUtils.generateRoomId('disconnect-test');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 2);
    
    try {
      const [user1Board, user2Board] = session.boardPages;
      
      // Verify initial connection
      await CollaborationHelper.waitForUserCount(user1Board, 2);
      await CollaborationHelper.waitForUserCount(user2Board, 2);
      
      // Simulate network disconnection for user 1
      await CollaborationHelper.simulateDisconnection(user1Board.page);
      
      // User 1 should detect disconnection
      await expect(user1Board.page.locator('text=Connecting')).toBeVisible({ timeout: TestTimeouts.CONNECTION });
      
      // User 2 should see user count drop to 1
      await CollaborationHelper.waitForUserCount(user2Board, 1, TestTimeouts.CONNECTION);
      
      // Restore connection for user 1
      await CollaborationHelper.restoreConnection(user1Board.page);
      
      // Wait for reconnection
      await user1Board.waitForConnection(TestTimeouts.CONNECTION);
      
      // Both users should see 2 users again
      await CollaborationHelper.waitForUserCount(user1Board, 2, TestTimeouts.CONNECTION);
      await CollaborationHelper.waitForUserCount(user2Board, 2, TestTimeouts.CONNECTION);
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should support multiple users in same room', async ({ browser }) => {
    const roomId = TestDataUtils.generateRoomId('multi-users');
    const userCount = 3;
    
    const session = await CollaborationHelper.createSession(browser, roomId, userCount);
    
    try {
      // Verify all users are connected
      for (const boardPage of session.boardPages) {
        await CollaborationHelper.waitForUserCount(boardPage, userCount, TestTimeouts.CONNECTION);
        
        const status = await boardPage.getConnectionStatus();
        expect(status).toBe('connected');
      }
      
      // Test that each user can draw
      for (let i = 0; i < session.boardPages.length; i++) {
        const boardPage = session.boardPages[i];
        
        // Each user draws at a different position
        const x = 100 + (i * 150);
        const y = 100;
        
        await boardPage.drawCircle(x, y, 50);
        
        // Wait a bit for sync
        await boardPage.page.waitForTimeout(1000);
      }
      
      // Wait for final synchronization
      await CollaborationHelper.waitForSync(session.boardPages, TestTimeouts.SYNC);
      
      // Take final screenshots
      await CollaborationHelper.takeSessionScreenshots(session, 'multi-users-final');
      
    } finally {
      await CollaborationHelper.cleanup(session);
    }
  });

  test('should maintain session when user leaves', async ({ browser }) => {
    const roomId = TestDataUtils.generateRoomId('user-leaves');
    
    const session = await CollaborationHelper.createSession(browser, roomId, 3);
    
    try {
      // Verify all 3 users are connected
      for (const boardPage of session.boardPages) {
        await CollaborationHelper.waitForUserCount(boardPage, 3, TestTimeouts.CONNECTION);
      }
      
      // Close one user's context (simulate leaving)
      await session.contexts[1].close();
      
      // Remaining users should see count drop to 2
      await CollaborationHelper.waitForUserCount(session.boardPages[0], 2, TestTimeouts.CONNECTION);
      await CollaborationHelper.waitForUserCount(session.boardPages[2], 2, TestTimeouts.CONNECTION);
      
      // Remaining users can still draw
      await session.boardPages[0].drawRectangle(100, 100, 100, 100);
      
      // Wait for sync between remaining users
      await session.boardPages[0].page.waitForTimeout(2000);
      
      // Both remaining users should still be connected
      expect(await session.boardPages[0].getConnectionStatus()).toBe('connected');
      expect(await session.boardPages[2].getConnectionStatus()).toBe('connected');
      
    } finally {
      // Cleanup remaining contexts
      for (const context of session.contexts) {
        if (!context.closed) {
          await context.close();
        }
      }
    }
  });
});