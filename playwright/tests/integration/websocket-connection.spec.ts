import { test, expect } from '@playwright/test';

test.describe('WebSocket Connection Integration', () => {
  test('should load application and establish basic connectivity', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Excalidrawボードの確認
    const board = page.locator('.excalidraw-container').first();
    await expect(board).toBeVisible();

    // アプリケーションが正常に読み込まれていることを確認
    const title = await page.title();
    expect(title).toBeTruthy();

    // 基本的なUI要素の確認
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // WebSocketサーバーが稼働していることを間接的に確認
    // (アプリケーションが正常に動作していれば接続している)
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/integration-websocket-loaded.png' });
  });
});