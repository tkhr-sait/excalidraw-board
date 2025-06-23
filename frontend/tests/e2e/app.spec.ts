import { test, expect } from '@playwright/test';

test.describe('Excalidraw App', () => {
  test('should load the application without errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the Excalidraw canvas to load
    await expect(page.locator('[data-testid="excalidraw-canvas"]')).toBeVisible();
    
    // Check that no JavaScript errors occurred
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to ensure any errors would have been captured
    await page.waitForTimeout(2000);
    
    // Assert no errors occurred
    expect(errors.filter(error => !error.includes('favicon.ico'))).toEqual([]);
  });

  test('should have the correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Excalidraw Board');
  });
});