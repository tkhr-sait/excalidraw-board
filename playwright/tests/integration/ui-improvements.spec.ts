import { test } from '@playwright/test';

test.describe('UI Improvements Integration', () => {
  test('should capture collaboration features UI screenshots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for app to load completely
    await page.waitForTimeout(2000);

    // Take a screenshot of the initial state with new UI
    await page.screenshot({ path: 'screenshots/ui-improvements-initial.png' });

    // Try to find and click settings button
    const settingsButton = page.getByRole('button', { name: /⚙️ 設定/ });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Take a screenshot with settings panel open
      await page.screenshot({ path: 'screenshots/ui-improvements-settings-open.png' });

      // Try to fill room and username inputs
      const roomInput = page.locator('input[placeholder*="ルーム名"]');
      const userNameInput = page.locator('input[placeholder*="ユーザー名"]');
      
      if (await roomInput.isVisible()) {
        await roomInput.fill('test-room-123');
      }
      
      if (await userNameInput.isVisible()) {
        await userNameInput.fill('テストユーザー');
      }

      // Apply settings if possible
      const applyButton = page.getByRole('button', { name: /適用/ });
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);
      }

      // Try to start collaboration
      const collabButton = page.getByRole('button', { name: /コラボ開始/ });
      if (await collabButton.isVisible()) {
        await collabButton.click();
        await page.waitForTimeout(2000);

        // Take a screenshot with collaboration active
        await page.screenshot({ path: 'screenshots/ui-improvements-collaboration-active.png' });

        // Try to stop collaboration
        const stopButton = page.getByRole('button', { name: /コラボ停止/ });
        if (await stopButton.isVisible()) {
          await stopButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'screenshots/ui-improvements-final.png' });
  });
});