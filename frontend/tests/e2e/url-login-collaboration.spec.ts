import { test, expect } from '@playwright/test';

test.describe('URL Login Collaboration', () => {
  test('should automatically start collaborating when accessing URL with room parameters', async ({ page }) => {
    // Test URL with room and username parameters
    const roomId = `url-test-${Date.now()}`;
    const username = 'URLTestUser';
    
    // Navigate to URL with room parameters
    await page.goto(`/?room=${roomId}&username=${username}`);
    
    // Wait for the application to load
    await expect(page.locator('[data-testid="excalidraw-canvas"]')).toBeVisible();
    
    // Wait longer for auto-join to trigger
    await page.waitForTimeout(10000);
    
    // Check if collaboration is automatically started
    // The Share button should show "Leave Room" if collaboration is active
    const shareButton = page.locator('button').filter({ hasText: /Share|共有|Collaborate|Leave/i }).first();
    await expect(shareButton).toBeVisible();
    
    // Check the button text to see if we're in collaboration mode
    const buttonText = await shareButton.textContent();
    console.log('Share button text:', buttonText);
    
    // If collaboration worked, we should see "Leave Room" or similar
    // If not, we should see "Share" or similar
    const isCollaborating = buttonText?.includes('Leave') || buttonText?.includes('退出');
    
    if (isCollaborating) {
      console.log('✓ URL login collaboration is working - automatically started collaborating');
      
      // Verify collaboration state indicators
      await expect(page.locator('.collab-status-indicator')).toBeVisible();
      
      // Check if room ID is displayed somewhere
      const roomIndicator = page.locator(`text=${roomId}`);
      if (await roomIndicator.isVisible()) {
        console.log('✓ Room ID is displayed in UI');
      }
      
    } else {
      console.log('✗ URL login collaboration is NOT working - Share button still shows:', buttonText);
      
      // The issue: Share button is not clicked automatically
      // URL parameters are processed but collaboration state doesn't activate
      console.log('Issue: URL parameters processed but collaboration not activated');
      
      // Let's check if the URL parameters were processed
      const urlParamDebug = await page.evaluate(() => {
        return {
          currentRoomId: (window as any).currentRoomId,
          currentUsername: (window as any).currentUsername,
          isCollaborating: (window as any).isCollaborating,
          pendingUrlJoin: (window as any).pendingUrlJoin
        };
      });
      console.log('URL param processing debug:', urlParamDebug);
    }
    
    // Capture console logs to see what's happening
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Wait a bit more and capture logs
    await page.waitForTimeout(2000);
    
    console.log('\n=== Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    // Fail the test if collaboration is not automatically started
    expect(isCollaborating).toBe(true);
  });
  
  test('should handle URL login even without Share button click', async ({ page }) => {
    // Capture all console messages to debug the issue
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    const roomId = `debug-url-test-${Date.now()}`;
    const username = 'DebugUser';
    
    // Navigate with URL parameters
    await page.goto(`/?room=${roomId}&username=${username}`);
    await expect(page.locator('[data-testid="excalidraw-canvas"]')).toBeVisible();
    
    // Wait for auto-join processing
    await page.waitForTimeout(3000);
    
    // Check collaboration state through global variables
    const collaborationState = await page.evaluate(() => {
      return {
        isCollaborating: (window as any).isCollaborating,
        socketConnected: (window as any).socketConnected,
        pendingUrlJoin: (window as any).pendingUrlJoin,
        currentRoomId: (window as any).currentRoomId,
        currentUsername: (window as any).currentUsername
      };
    });
    
    console.log('Collaboration state:', collaborationState);
    console.log('\n=== Debug Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    // The test should reveal the issue: URL params are processed but collaboration state is not activated
    // This helps us understand exactly what's failing
  });
  
  test('should compare URL login vs Share button login', async ({ page }) => {
    // First test: manual Share button login
    await page.goto('/');
    await expect(page.locator('[data-testid="excalidraw-canvas"]')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const shareButton = page.locator('button').filter({ hasText: /Share|共有|Collaborate/i }).first();
    await shareButton.click({ force: true });
    
    await page.locator('input[placeholder="Enter room ID"]').fill('manual-test');
    await page.locator('input[placeholder="Enter your name"]').fill('ManualUser');
    await page.locator('button[type="submit"]:has-text("Join")').click();
    
    await page.waitForTimeout(3000);
    
    const manualState = await page.evaluate(() => ({
      isCollaborating: (window as any).isCollaborating,
      socketConnected: (window as any).socketConnected
    }));
    
    console.log('Manual login state:', manualState);
    
    // Now test URL login in the same page
    await page.goto(`/?room=url-test&username=URLUser`);
    await page.waitForTimeout(5000);
    
    const urlState = await page.evaluate(() => ({
      isCollaborating: (window as any).isCollaborating,
      socketConnected: (window as any).socketConnected,
      pendingUrlJoin: (window as any).pendingUrlJoin
    }));
    
    console.log('URL login state:', urlState);
    
    // This comparison will help identify the exact difference
  });
});