import { Page, expect } from '@playwright/test';

export async function generateRoomId(): Promise<string> {
  return `test-room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function waitForSocketConnection(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const connectionStatus = document.querySelector('.connection-status');
        return connectionStatus && connectionStatus.textContent?.includes('Connected');
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

export async function clearBrowserData(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function takeScreenshotOnFailure(
  page: Page,
  testName: string
): Promise<void> {
  try {
    await page.screenshot({
      path: `test-results/failures/${testName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.png`,
      fullPage: true,
    });
  } catch (error) {
    console.log(`Failed to take screenshot: ${error}`);
  }
}

export async function waitForCanvasLoad(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="excalidraw-canvas"]')).toBeVisible();
  
  // Welcome screenを閉じる
  try {
    const welcomeScreen = page.locator('.welcome-screen-center, .welcome-screen-hint');
    if (await welcomeScreen.isVisible({ timeout: 2000 })) {
      await page.keyboard.press('Escape');
      await welcomeScreen.waitFor({ state: 'hidden', timeout: 2000 });
    }
  } catch {
    // Welcome screenがない場合は無視
  }
  
  // Canvasがクリック可能になるまで待つ
  await page.waitForTimeout(1000);
}

export async function getElementsOnCanvas(page: Page): Promise<number> {
  try {
    return await page.evaluate(() => {
      // ExcalidrawのAPIが利用可能な場合
      const excalidrawAPI = (window as any).excalidrawAPI;
      if (excalidrawAPI && excalidrawAPI.getSceneElements) {
        return excalidrawAPI.getSceneElements().length;
      }
      
      // DOM要素を数える代替手段
      const svgElements = document.querySelectorAll('svg .excalidraw-layer g[data-type]');
      return svgElements.length;
    });
  } catch {
    return 0;
  }
}

export async function simulateCollaborativeDrawing(
  page1: Page,
  page2: Page,
  roomId: string
): Promise<boolean> {
  try {
    // 両ページでルームに参加
    await joinRoomHelper(page1, roomId, 'User1');
    await joinRoomHelper(page2, roomId, 'User2');
    
    // 接続状態を確認
    const connected1 = await waitForSocketConnection(page1, 5000);
    const connected2 = await waitForSocketConnection(page2, 5000);
    
    return connected1 && connected2;
  } catch {
    return false;
  }
}

export async function joinRoomHelper(page: Page, roomId: string, username: string): Promise<void> {
  await page.locator('button:has-text("Join Room")').click({ force: true });
  
  // ダイアログが表示されるまで待つ
  await expect(page.locator('.room-dialog-overlay')).toBeVisible();
  
  await page.locator('input[placeholder="Enter room ID"]').fill(roomId);
  await page.locator('input[placeholder="Enter your name"]').fill(username);
  await page.locator('button[type="submit"]:has-text("Join")').click();
  
  // 結果を待つ
  await page.waitForTimeout(2000);
}

export async function measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;
  
  console.log(`${operationName} took ${duration}ms`);
  
  return { result, duration };
}

export async function verifyNoJavaScriptErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(`Page error: ${error.message}`);
  });
  
  return errors;
}

export async function setupCollaborationTest(
  page1: Page,
  page2: Page
): Promise<{ roomId: string; cleanup: () => Promise<void> }> {
  const roomId = await generateRoomId();
  
  // 両ページをセットアップ
  await waitForCanvasLoad(page1);
  await waitForCanvasLoad(page2);
  
  const cleanup = async () => {
    try {
      // ルームから退出
      if (await page1.locator('button:has-text("Leave Room")').isVisible()) {
        await page1.locator('button:has-text("Leave Room")').click();
      }
      if (await page2.locator('button:has-text("Leave Room")').isVisible()) {
        await page2.locator('button:has-text("Leave Room")').click();
      }
    } catch {
      // 清理エラーは無視
    }
  };
  
  return { roomId, cleanup };
}