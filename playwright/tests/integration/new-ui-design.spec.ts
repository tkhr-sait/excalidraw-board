import { test } from '@playwright/test';

test.describe('New UI Design Integration', () => {
  test('should capture new collaboration header UI like the image reference', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for app to load completely
    await page.waitForTimeout(3000);

    // Take a screenshot of the initial state 
    await page.screenshot({ path: 'screenshots/new-ui-initial.png' });

    // Try to find and click settings button
    const settingsButton = page.locator('button').filter({ hasText: /⚙️/ });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Take a screenshot with settings panel open
      await page.screenshot({ path: 'screenshots/new-ui-settings-open.png' });

      // Try to fill room and username inputs
      const roomInput = page.locator('input[placeholder*="ルーム名"]');
      const userNameInput = page.locator('input[placeholder*="ユーザー名"]');
      
      if (await roomInput.isVisible()) {
        await roomInput.fill('テストルーム');
      }
      
      if (await userNameInput.isVisible()) {
        await userNameInput.fill('まさき');
      }

      // Apply settings
      const applyButton = page.getByRole('button', { name: /適用/ });
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);
      }

      // Try to start collaboration to show the user badge and connection count
      const shareButton = page.getByRole('button', { name: /Share/ });
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(2000);

        // Take a screenshot with collaboration active showing user badge and connection count
        await page.screenshot({ path: 'screenshots/new-ui-collaboration-active.png' });

        // Take a close-up screenshot of just the header area
        const headerArea = page.locator('.layer-ui__wrapper__top-right');
        if (await headerArea.isVisible()) {
          await headerArea.screenshot({ path: 'screenshots/new-ui-header-closeup.png' });
        }

        // Wait a bit more to ensure connection is established
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshots/new-ui-final-state.png' });
      }
    }

    // Take final screenshot regardless of interaction success
    await page.screenshot({ path: 'screenshots/new-ui-final.png' });
  });
});