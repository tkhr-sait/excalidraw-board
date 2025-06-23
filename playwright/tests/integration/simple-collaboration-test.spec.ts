import { test, expect } from '@playwright/test';

test.describe('Simple Collaboration Test', () => {
  test('should load the application and show collaboration button', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await expect(page.locator('[data-testid="excalidraw-board"]')).toBeVisible();
    
    // Take a screenshot
    await page.screenshot({ path: 'playwright/screenshots/simple-test-loaded.png' });
    
    // Check if collaboration button exists
    const collaborationButton = page.locator('[data-testid="collaboration-button"]');
    await expect(collaborationButton).toBeVisible();
    
    // Click the collaboration button
    await collaborationButton.click();
    
    // Wait a moment
    await page.waitForTimeout(1000);
    
    // Check if collaboration status appears
    await expect(page.locator('[data-testid="collaboration-status"]')).toBeVisible();
    
    // Take final screenshot
    await page.screenshot({ path: 'playwright/screenshots/simple-test-collaboration-started.png' });
    
    console.log('✅ Basic collaboration functionality is working');
  });
});