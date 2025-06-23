import { test } from '@playwright/test';

test.describe('Custom Toolbar Integration', () => {
  test('should capture custom toolbar using Excalidraw native components', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for app to load completely
    await page.waitForTimeout(3000);

    // Take initial screenshot showing default state
    await page.screenshot({ path: 'screenshots/custom-toolbar-initial.png' });

    // Try to open the main menu to see collaboration items
    const menuButton = page.locator('button[aria-label*="Menu"], .App-menu__trigger, [data-testid*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot with main menu open showing collaboration items
      await page.screenshot({ path: 'screenshots/custom-toolbar-main-menu.png' });

      // Try to find and click collaboration settings
      const collabSettings = page.getByText('ルーム設定');
      if (await collabSettings.isVisible()) {
        await collabSettings.click();
        await page.waitForTimeout(1000);

        // Take screenshot with room settings dialog
        await page.screenshot({ path: 'screenshots/custom-toolbar-room-settings.png' });

        // Fill in room settings
        const roomInput = page.locator('input[placeholder*="ルーム名"]');
        const userInput = page.locator('input[placeholder*="ユーザー名"]');
        
        if (await roomInput.isVisible()) {
          await roomInput.fill('デモルーム');
        }
        
        if (await userInput.isVisible()) {
          await userInput.fill('テストユーザー');
        }

        // Apply settings
        const applyButton = page.getByText('適用');
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForTimeout(2000);
        }
      } else {
        // Try direct collaboration start
        const collabStart = page.getByText('コラボレーション開始');
        if (await collabStart.isVisible()) {
          await collabStart.click();
          await page.waitForTimeout(2000);
        }
      }

      // Close menu by clicking outside or escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Take screenshot showing collaboration active state with top-right UI
    await page.screenshot({ path: 'screenshots/custom-toolbar-collaboration-active.png' });

    // Try to capture the footer area
    const footer = page.locator('footer[role="contentinfo"]').first();
    if (await footer.isVisible()) {
      await footer.screenshot({ path: 'screenshots/custom-toolbar-footer.png' });
    }

    // Take final comprehensive screenshot
    await page.screenshot({ path: 'screenshots/custom-toolbar-final.png' });

    // Take additional screenshot showing footer info is working
    await page.screenshot({ path: 'screenshots/custom-toolbar-footer-info.png' });
  });
});