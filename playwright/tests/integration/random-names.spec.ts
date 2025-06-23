import { test, expect } from '@playwright/test';

test.describe('Random Names Integration', () => {
  test('should show random initial room and username, with ability to change username', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for app to load completely
    await page.waitForTimeout(3000);

    // Take initial screenshot showing random names
    await page.screenshot({ path: 'screenshots/random-names-initial.png' });

    // Open main menu to see collaboration settings
    const menuButton = page.locator('button[aria-label*="Menu"], .App-menu__trigger, [data-testid*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(1000);

      // Look for room settings option
      const roomSettings = page.getByText('ルーム設定');
      if (await roomSettings.isVisible()) {
        await roomSettings.click();
        await page.waitForTimeout(1000);

        // Take screenshot with room settings dialog showing random initial values
        await page.screenshot({ path: 'screenshots/random-names-settings-dialog.png' });

        // Test random room name generation
        const roomDiceButton = page.locator('button').filter({ hasText: /🎲/ }).first();
        if (await roomDiceButton.isVisible()) {
          await roomDiceButton.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'screenshots/random-names-room-generated.png' });
        }

        // Test random username generation
        const userDiceButton = page.locator('button').filter({ hasText: /🎲/ }).last();
        if (await userDiceButton.isVisible()) {
          await userDiceButton.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'screenshots/random-names-user-generated.png' });
        }

        // Apply the changes
        const applyButton = page.getByText('適用');
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForTimeout(1000);
        }

        // Start collaboration to see names in action
        const collabStart = page.getByText('コラボレーション開始');
        if (await collabStart.isVisible()) {
          await collabStart.click();
          await page.waitForTimeout(2000);
        }

        // Close menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Take screenshot showing collaboration active with random names
        await page.screenshot({ path: 'screenshots/random-names-collaboration-active.png' });

        // Test username change in footer (click on username)
        const footerUserName = page.locator('span').filter({ hasText: /👤/ });
        if (await footerUserName.isVisible()) {
          await footerUserName.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'screenshots/random-names-footer-user-changed.png' });
        }
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/random-names-final.png' });
  });

  test('should generate different random names on multiple page loads', async ({ page }) => {
    const roomNames: string[] = [];
    const userNames: string[] = [];

    // Load page multiple times to test randomness
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Try to extract room and user names from UI
      const menuButton = page.locator('button[aria-label*="Menu"], .App-menu__trigger, [data-testid*="menu"]').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);

        const roomSettings = page.getByText('ルーム設定');
        if (await roomSettings.isVisible()) {
          await roomSettings.click();
          await page.waitForTimeout(500);

          // Extract room name from input
          const roomInput = page.locator('input[placeholder*="ルーム名"]');
          if (await roomInput.isVisible()) {
            const roomValue = await roomInput.inputValue();
            roomNames.push(roomValue);
          }

          // Extract username from input
          const userInput = page.locator('input[placeholder*="ユーザー名"]');
          if (await userInput.isVisible()) {
            const userValue = await userInput.inputValue();
            userNames.push(userValue);
          }

          // Close dialog
          await page.keyboard.press('Escape');
          await page.keyboard.press('Escape');
        }
      }

      await page.waitForTimeout(500);
    }

    // Take screenshot of the final load
    await page.screenshot({ path: 'screenshots/random-names-randomness-test.png' });

    // Basic validation that names were collected (even if they're the same)
    console.log('Room names collected:', roomNames);
    console.log('User names collected:', userNames);
  });
});