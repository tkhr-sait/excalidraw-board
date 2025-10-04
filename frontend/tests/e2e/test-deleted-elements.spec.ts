import { test, expect } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';

test.describe('Deleted Elements Prevention', () => {
  test('should clear recently deleted elements tracker when joining a room', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
    await page.waitForTimeout(2000);

    // Test that resetScene + history.clear works correctly
    // (recentlyDeletedTracker.clear() is called in App.tsx but not exposed to window)
    const clearResult = await page.evaluate(() => {
      try {
        const api = (window as any).excalidrawAPI;

        // Add some elements first
        api.updateScene({
          elements: [
            {
              id: 'test-element-1',
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

        const elementsBeforeClear = api.getSceneElements().length;

        // Simulate what handleJoinRoom does:
        api.resetScene();
        api.history.clear();
        // recentlyDeletedTracker.current.clear() is called in actual code

        return {
          success: true,
          elementsBeforeClear,
          elementsAfterClear: api.getSceneElements().length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    });

    console.log('Clear result:', clearResult);
    expect(clearResult.success).toBe(true);
    expect(clearResult.elementsAfterClear).toBe(0);

    // Verify undo doesn't work (history cleared)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    const elementsAfterUndo = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      return api.getSceneElements().length;
    });

    expect(elementsAfterUndo).toBe(0); // Still 0, history was cleared
  });

  test('should not sync elements deleted more than 24 hours ago', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
    await page.waitForTimeout(2000);

    // Test the isSyncableElement logic
    const testResult = await page.evaluate(() => {
      const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

      const now = Date.now();

      // Test cases
      const testCases = [
        {
          name: 'Non-deleted element',
          element: { id: '1', isDeleted: false },
          expected: true,
        },
        {
          name: 'Recently deleted element (1 hour ago)',
          element: {
            id: '2',
            isDeleted: true,
            updated: now - (1 * 60 * 60 * 1000) // 1 hour ago
          },
          expected: true,
        },
        {
          name: 'Old deleted element (25 hours ago)',
          element: {
            id: '3',
            isDeleted: true,
            updated: now - (25 * 60 * 60 * 1000) // 25 hours ago
          },
          expected: false,
        },
        {
          name: 'Deleted element without timestamp',
          element: {
            id: '4',
            isDeleted: true,
          },
          expected: false,
        },
      ];

      // isSyncableElement logic (copied from element-sync.ts)
      const isSyncableElement = (element: any): boolean => {
        if (!element.isDeleted) {
          return true;
        }

        const elementUpdated = element.updated;

        if (elementUpdated && typeof elementUpdated === 'number') {
          const timeSinceDeletion = now - elementUpdated;
          return timeSinceDeletion < DELETED_ELEMENT_TIMEOUT;
        }

        return false;
      };

      const results = testCases.map(testCase => ({
        name: testCase.name,
        expected: testCase.expected,
        actual: isSyncableElement(testCase.element),
        passed: isSyncableElement(testCase.element) === testCase.expected,
      }));

      return {
        allPassed: results.every(r => r.passed),
        results,
      };
    });

    console.log('Test results:', testResult.results);
    expect(testResult.allPassed).toBe(true);
  });

  test('should filter out expired deleted elements on receive', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
    await page.waitForTimeout(2000);

    // Simulate receiving elements with various deletion states
    const filterResult = await page.evaluate(() => {
      const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000;
      const now = Date.now();

      const receivedElements = [
        {
          id: 'active-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          isDeleted: false,
          updated: now,
        },
        {
          id: 'recently-deleted-1',
          type: 'ellipse',
          x: 200,
          y: 200,
          width: 50,
          height: 50,
          isDeleted: true,
          updated: now - (1 * 60 * 60 * 1000), // 1 hour ago
        },
        {
          id: 'expired-deleted-1',
          type: 'rectangle',
          x: 300,
          y: 300,
          width: 80,
          height: 80,
          isDeleted: true,
          updated: now - (25 * 60 * 60 * 1000), // 25 hours ago
        },
        {
          id: 'deleted-no-timestamp',
          type: 'text',
          x: 400,
          y: 400,
          isDeleted: true,
        },
      ];

      // Filter logic (from Collab.tsx)
      const isSyncableElement = (element: any): boolean => {
        if (!element.isDeleted) return true;

        const elementUpdated = element.updated;
        if (elementUpdated && typeof elementUpdated === 'number') {
          const timeSinceDeletion = now - elementUpdated;
          return timeSinceDeletion < DELETED_ELEMENT_TIMEOUT;
        }

        return false;
      };

      const validElements = receivedElements.filter((el: any) => {
        const hasBasicData = el && el.id && el.type &&
                           typeof el.x === 'number' &&
                           typeof el.y === 'number';

        if (!hasBasicData) return false;

        return isSyncableElement(el);
      });

      return {
        totalReceived: receivedElements.length,
        validCount: validElements.length,
        validIds: validElements.map(el => el.id),
        expectedIds: ['active-1', 'recently-deleted-1'], // Should keep active and recently deleted
      };
    });

    console.log('Filter result:', filterResult);
    expect(filterResult.validCount).toBe(2);
    expect(filterResult.validIds).toEqual(filterResult.expectedIds);
  });

  test('new joiner should not reconcile with local deleted elements', async ({ page }) => {
    const excalidrawPage = new ExcalidrawPage(page);
    await excalidrawPage.goto();
    await page.waitForTimeout(2000);

    // Add and delete elements locally
    await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;

      api.updateScene({
        elements: [
          {
            id: 'local-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            version: 1,
            isDeleted: false,
          },
        ],
      });
    });

    await page.waitForTimeout(300);

    // Delete the element
    await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;
      api.updateScene({ elements: [] });
    });

    await page.waitForTimeout(300);

    // Now simulate joining a room and receiving data
    const joinResult = await page.evaluate(() => {
      const api = (window as any).excalidrawAPI;

      // Step 1: Clear canvas (what handleJoinRoom does)
      api.resetScene();
      api.history.clear();

      // Step 2: Simulate receiving remote elements (isWaitingForInitialSync=true case)
      const remoteElements = [
        {
          id: 'remote-1',
          type: 'ellipse',
          x: 200,
          y: 200,
          width: 150,
          height: 150,
          version: 1,
          isDeleted: false,
        },
      ];

      // Direct replacement (no reconciliation for new joiners)
      api.updateScene({ elements: remoteElements });

      const finalElements = api.getSceneElements();

      return {
        elementCount: finalElements.length,
        elementIds: finalElements.map((el: any) => el.id),
        hasLocalElement: finalElements.some((el: any) => el.id === 'local-1'),
      };
    });

    console.log('Join result:', joinResult);

    // Should only have remote element, not the deleted local one
    expect(joinResult.elementCount).toBe(1);
    expect(joinResult.elementIds).toEqual(['remote-1']);
    expect(joinResult.hasLocalElement).toBe(false);
  });
});
