import { Page } from '@playwright/test';

export async function enableCollaboration(page: Page): Promise<void> {
  await page.locator('[aria-label="Live collaboration"]').click();
  await page.waitForSelector('text=接続中');
}

export async function drawRectangle(
  page: Page, 
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number
): Promise<void> {
  await page.click('[aria-label="Rectangle"]');
  const canvas = page.locator('canvas').first();
  await canvas.dragTo(canvas, {
    sourcePosition: { x: x1, y: y1 },
    targetPosition: { x: x2, y: y2 },
  });
}

export async function waitForSync(page: Page, timeout = 1000): Promise<void> {
  await page.waitForTimeout(timeout);
}

export async function getElementCount(page: Page): Promise<number> {
  return await page.locator('.excalidraw-element').count();
}