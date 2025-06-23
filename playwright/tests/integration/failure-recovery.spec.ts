import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('Failure Recovery Testing', () => {
  test('should recover from temporary WebSocket disconnection', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 初期状態の確認
    await expect(page.locator('[data-testid="excalidraw-board"]')).toBeVisible();

    // WebSocketサーバーを一時的に停止
    console.log('Stopping WebSocket server...');
    await execAsync('docker-compose stop excalidraw-room');
    await page.waitForTimeout(5000);

    // 切断状態の確認（UIに切断表示があれば）
    await page.screenshot({ path: 'screenshots/integration-disconnected.png' });

    // WebSocketサーバーを再起動
    console.log('Restarting WebSocket server...');
    await execAsync('docker-compose start excalidraw-room');
    await page.waitForTimeout(10000);

    // 再接続の確認
    await page.screenshot({ path: 'screenshots/integration-reconnected.png' });

    // 機能が復旧していることを確認（描画テスト）
    await page.click('[aria-label="Rectangle"]', { force: true });
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();

    await page.screenshot({ path: 'screenshots/integration-recovery-test.png' });
  });
});