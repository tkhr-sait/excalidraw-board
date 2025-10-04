import { test, expect } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';

test.describe('Excalidraw API Functionality', () => {
  test('resetScene should be callable and clear elements', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
    await page.waitForTimeout(2000);

    // Add test elements programmatically
    await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      if (!api) throw new Error('ExcalidrawAPI not found');

      // Add elements
      api.updateScene({
        elements: [
          {
            id: 'test-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            angle: 0,
            version: 1,
            versionNonce: 1,
            isDeleted: false,
          },
        ],
      });
    });

    // Verify elements exist
    const elementsCount = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api.getSceneElements().length;
    });

    console.log('Elements after adding:', elementsCount);
    expect(elementsCount).toBe(1);

    // Call resetScene
    const resetResult = await page.evaluate(() => {
      try {
        const api = (window as any).excalidrawAPI;
        api.resetScene();
        return { success: true, error: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log('resetScene result:', resetResult);
    expect(resetResult.success).toBe(true);
    expect(resetResult.error).toBeNull();

    await page.waitForTimeout(500);

    // Verify elements are cleared
    const elementsAfterReset = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api.getSceneElements().length;
    });

    console.log('Elements after resetScene:', elementsAfterReset);
    expect(elementsAfterReset).toBe(0);
  });

  test('history.clear should be callable', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
    await page.waitForTimeout(2000);

    // Call history.clear
    const clearResult = await page.evaluate(() => {
      try {
        const api = (window as any).excalidrawAPI;
        api.history.clear();
        return { success: true, error: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log('history.clear result:', clearResult);
    expect(clearResult.success).toBe(true);
    expect(clearResult.error).toBeNull();
  });

  test('Combined resetScene and history.clear (used in collaboration join)', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
    await page.waitForTimeout(2000);

    // Add elements and create history
    await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;

      // Add first element
      api.updateScene({
        elements: [
          {
            id: 'test-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            angle: 0,
            version: 1,
            versionNonce: 1,
            isDeleted: false,
          },
        ],
      });
    });

    await page.waitForTimeout(300);

    // Add second element to create history
    await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      const existingElements = api.getSceneElements();

      api.updateScene({
        elements: [
          ...existingElements,
          {
            id: 'test-2',
            type: 'ellipse',
            x: 300,
            y: 200,
            width: 150,
            height: 150,
            angle: 0,
            version: 1,
            versionNonce: 2,
            isDeleted: false,
          },
        ],
      });
    });

    await page.waitForTimeout(300);

    // Execute the same commands as handleJoinRoom
    const joinRoomClearResult = await page.evaluate(() => {
      try {
        const api = (window as any).excalidrawAPI;

        // This is what App.tsx does when joining a room
        api.resetScene();
        api.history.clear();

        return {
          success: true,
          error: null,
          elementsAfter: api.getSceneElements().length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          elementsAfter: -1,
        };
      }
    });

    console.log('Join room clear result:', joinRoomClearResult);
    expect(joinRoomClearResult.success).toBe(true);
    expect(joinRoomClearResult.error).toBeNull();
    expect(joinRoomClearResult.elementsAfter).toBe(0);

    // Verify undo has no effect (history cleared)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    const elementsAfterUndo = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api.getSceneElements().length;
    });

    console.log('Elements after undo attempt:', elementsAfterUndo);
    expect(elementsAfterUndo).toBe(0); // Still 0, history was cleared
  });
});
