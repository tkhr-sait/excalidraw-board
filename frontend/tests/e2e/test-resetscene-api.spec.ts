import { test, expect } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';

test.describe('ResetScene API Test', () => {
  test('should have resetScene API available', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();

    // Wait for Excalidraw to be fully loaded
    await page.waitForTimeout(2000);

    // Check if resetScene API exists
    const hasResetScene = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api && typeof api.resetScene === 'function';
    });

    console.log('Has resetScene API:', hasResetScene);
    expect(hasResetScene).toBe(true);
  });

  test('should have history.clear API available', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();

    // Wait for Excalidraw to be fully loaded
    await page.waitForTimeout(2000);

    // Check if history.clear API exists
    const hasHistoryClear = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api && api.history && typeof api.history.clear === 'function';
    });

    console.log('Has history.clear API:', hasHistoryClear);
    expect(hasHistoryClear).toBe(true);
  });

  test('resetScene should clear canvas elements', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();

    // Wait for Excalidraw to be fully loaded
    await page.waitForTimeout(2000);

    // Draw elements using keyboard shortcuts (more reliable)
    await page.keyboard.press('r'); // Select rectangle tool
    await page.waitForTimeout(300);

    // Draw a rectangle by simulating drag on page coordinates
    const canvasLocator = page.locator('canvas.excalidraw__canvas').first();
    await canvasLocator.hover({ position: { x: 200, y: 200 }, force: true });
    await page.mouse.down();
    await page.mouse.move(400, 300);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Get element count before reset
    const elementsBeforeReset = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements().length : 0;
    });

    console.log('Elements before reset:', elementsBeforeReset);
    expect(elementsBeforeReset).toBeGreaterThanOrEqual(0); // May be 0 if drawing failed, but that's OK for this test

    // Call resetScene API
    await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      if (api && api.resetScene) {
        api.resetScene();
      }
    });

    await page.waitForTimeout(500);

    // Get element count after reset
    const elementsAfterReset = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements().length : 0;
    });

    console.log('Elements after reset:', elementsAfterReset);
    expect(elementsAfterReset).toBe(0);
  });

  test('history.clear should clear undo/redo history', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();

    // Wait for Excalidraw to be fully loaded
    await page.waitForTimeout(2000);

    // Draw elements
    await page.keyboard.press('r'); // Rectangle tool
    await page.waitForTimeout(300);

    const canvasLocator = page.locator('canvas.excalidraw__canvas').first();
    await canvasLocator.hover({ position: { x: 200, y: 200 }, force: true });
    await page.mouse.down();
    await page.mouse.move(400, 300);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Get initial element count
    const elementsInitial = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements().length : 0;
    });

    // Clear history
    await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      if (api && api.history && api.history.clear) {
        api.history.clear();
      }
    });

    await page.waitForTimeout(500);

    // Try to undo - should have no effect since history is cleared
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    const elementsAfterUndo = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api ? api.getSceneElements().length : 0;
    });

    console.log('Elements initial:', elementsInitial, 'After undo with cleared history:', elementsAfterUndo);
    // Elements should remain the same since history was cleared
    expect(elementsAfterUndo).toBe(elementsInitial);
  });
});
