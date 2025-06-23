import { test, expect } from '@playwright/test';

test.describe('Footer Collaboration Toolbar', () => {
  test('should show collaboration controls in footer', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/footer-toolbar-initial.png', fullPage: true });

    // Check for collaboration toggle button in footer
    const collabToggle = page.getByText('コラボ開始');
    await expect(collabToggle).toBeVisible();

    // Check for settings button
    const settingsButton = page.getByText('⚙️ 設定');
    await expect(settingsButton).toBeVisible();

    // Click collaboration start
    await collabToggle.click();
    await page.waitForTimeout(3000);

    // Take screenshot after starting collaboration
    await page.screenshot({ path: 'screenshots/footer-toolbar-collaboration-started.png', fullPage: true });

    // Should show collaboration info in footer
    const collabStop = page.getByText('コラボ停止');
    await expect(collabStop).toBeVisible();

    // Should show connection status
    const connectionStatus = page.locator('text=接続中, text=切断').first();
    await expect(connectionStatus).toBeVisible();

    // Should show URL copy button
    const urlCopyButton = page.getByText('📋 URLコピー');
    await expect(urlCopyButton).toBeVisible();

    // Test settings dialog
    await settingsButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot of settings dialog
    await page.screenshot({ path: 'screenshots/footer-toolbar-settings-dialog.png', fullPage: true });

    // Check settings dialog
    const settingsDialog = page.getByText('コラボレーション設定');
    await expect(settingsDialog).toBeVisible();

    // Check room name input
    const roomNameInput = page.locator('input[placeholder="ルーム名を入力"]');
    await expect(roomNameInput).toBeVisible();

    // Check username input
    const userNameInput = page.locator('input[placeholder="ユーザー名を入力"]');
    await expect(userNameInput).toBeVisible();

    // Check random buttons
    const randomButtons = page.locator('button:has-text("🎲")');
    await expect(randomButtons).toHaveCount(2);

    // Close settings dialog
    const cancelButton = page.getByText('キャンセル');
    await cancelButton.click();
    await page.waitForTimeout(1000);

    // Final screenshot
    await page.screenshot({ path: 'screenshots/footer-toolbar-final.png', fullPage: true });
  });
});