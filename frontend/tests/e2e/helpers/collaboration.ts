import { Browser, BrowserContext, Page } from '@playwright/test';
import { BoardPage } from '../pages/BoardPage';

export interface CollaborationSession {
  contexts: BrowserContext[];
  pages: Page[];
  boardPages: BoardPage[];
  roomId: string;
}

export class CollaborationHelper {
  /**
   * Creates a collaboration session with multiple users
   */
  static async createSession(
    browser: Browser,
    roomId: string,
    userCount: number = 2
  ): Promise<CollaborationSession> {
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const boardPages: BoardPage[] = [];

    for (let i = 0; i < userCount; i++) {
      // Create new browser context for each user (simulates different browsers/devices)
      const context = await browser.newContext({
        // Give each user a unique user agent to help with debugging
        userAgent: `PlaywrightCollaborationTest-User${i + 1}`,
      });
      
      const page = await context.newPage();
      const boardPage = new BoardPage(page);
      
      // Navigate to the room
      await boardPage.goto(roomId);
      await boardPage.waitForExcalidrawLoad();
      await boardPage.waitForConnection();
      
      contexts.push(context);
      pages.push(page);
      boardPages.push(boardPage);
      
      // Add small delay between user connections
      await page.waitForTimeout(500);
    }

    return {
      contexts,
      pages,
      boardPages,
      roomId
    };
  }

  /**
   * Closes all contexts in a collaboration session
   */
  static async cleanup(session: CollaborationSession) {
    for (const context of session.contexts) {
      await context.close();
    }
  }

  /**
   * Waits for a specific number of users to be connected
   */
  static async waitForUserCount(
    boardPage: BoardPage,
    expectedCount: number,
    timeout: number = 10000
  ) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentCount = await boardPage.getUserCount();
      if (currentCount === expectedCount) {
        return;
      }
      await boardPage.page.waitForTimeout(500);
    }
    
    throw new Error(`Expected ${expectedCount} users, but timeout reached`);
  }

  /**
   * Generates a unique room ID for testing
   */
  static generateRoomId(testName?: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    const prefix = testName ? testName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8) : 'test';
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Simulates network disconnection for a specific page
   */
  static async simulateDisconnection(page: Page) {
    // Set offline mode to simulate network disconnection
    await page.context().setOffline(true);
  }

  /**
   * Restores network connection for a specific page
   */
  static async restoreConnection(page: Page) {
    await page.context().setOffline(false);
  }

  /**
   * Waits for synchronization between multiple board pages
   * This is a simple implementation that waits for a fixed time
   * In a real scenario, you might want to check for specific elements or changes
   */
  static async waitForSync(
    boardPages: BoardPage[],
    timeoutMs: number = 3000
  ) {
    // Wait for changes to propagate
    await boardPages[0].page.waitForTimeout(timeoutMs);
  }

  /**
   * Takes synchronized screenshots of all pages in a session
   */
  static async takeSessionScreenshots(
    session: CollaborationSession,
    namePrefix: string
  ) {
    const screenshots = [];
    
    for (let i = 0; i < session.pages.length; i++) {
      const screenshotPath = `test-results/${namePrefix}-user${i + 1}.png`;
      await session.pages[i].screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      screenshots.push(screenshotPath);
    }
    
    return screenshots;
  }
}