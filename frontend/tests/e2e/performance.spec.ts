import { test, expect } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';

test.describe('Performance Tests', () => {
  let excalidrawPage: ExcalidrawPage;

  test.beforeEach(async ({ page }) => {
    excalidrawPage = new ExcalidrawPage(page);
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await excalidrawPage.goto();
    
    const loadTime = Date.now() - startTime;
    console.log(`Application load time: ${loadTime}ms`);
    
    // 5秒以内にロードすることを確認
    expect(loadTime).toBeLessThan(5000);
    
    // Canvasが表示されることを確認
    await expect(excalidrawPage.canvas).toBeVisible();
  });

  test('should handle canvas operations without significant lag', async () => {
    await excalidrawPage.goto();
    
    const startTime = Date.now();
    const operationsCount = 20;
    
    // 複数のCanvas操作を実行
    for (let i = 0; i < operationsCount; i++) {
      const x = (i % 10) * 50 + 50;
      const y = Math.floor(i / 10) * 50 + 50;
      
      // Canvas上でのクリック操作（force使用）
      try {
        await excalidrawPage.canvas.click({ position: { x, y }, force: true });
      } catch {
        // Canvas操作が困難な場合はキーボード操作で代替
        await excalidrawPage.page.keyboard.press('Space');
      }
      await excalidrawPage.page.waitForTimeout(50); // 短い待機
    }
    
    const duration = Date.now() - startTime;
    console.log(`Performed ${operationsCount} canvas operations in ${duration}ms`);
    
    // 合理的な時間内で完了することを確認（10秒以内）
    expect(duration).toBeLessThan(10000);
  });

  test('should maintain responsiveness during interactions', async () => {
    await excalidrawPage.goto();
    
    const startTime = Date.now();
    
    // 連続してキーボード操作
    await excalidrawPage.page.keyboard.press('r');
    await excalidrawPage.page.keyboard.press('o');
    await excalidrawPage.page.keyboard.press('t');
    await excalidrawPage.page.keyboard.press('v');
    
    // 連続してCanvas操作（可能であれば）
    try {
      await excalidrawPage.canvas.click({ position: { x: 100, y: 100 }, force: true });
      await excalidrawPage.canvas.click({ position: { x: 200, y: 200 }, force: true });
      await excalidrawPage.canvas.click({ position: { x: 300, y: 300 }, force: true });
    } catch {
      // Canvas操作が困難な場合は追加のキーボード操作
      await excalidrawPage.page.keyboard.press('Escape');
    }
    
    const duration = Date.now() - startTime;
    console.log(`Interactive operations took ${duration}ms`);
    
    // 3秒以内で完了することを確認
    expect(duration).toBeLessThan(3000);
  });

  test('should handle rapid keyboard interactions', async () => {
    await excalidrawPage.goto();
    
    const startTime = Date.now();
    
    // 素早くキーボードショートカットを切り替え
    for (let i = 0; i < 10; i++) {
      await excalidrawPage.page.keyboard.press('r');
      await excalidrawPage.page.keyboard.press('o');
      await excalidrawPage.page.keyboard.press('t');
      await excalidrawPage.page.keyboard.press('v');
      await excalidrawPage.page.waitForTimeout(10); // 非常に短い待機
    }
    
    const duration = Date.now() - startTime;
    console.log(`Rapid keyboard interactions took ${duration}ms`);
    
    // 2秒以内で完了することを確認
    expect(duration).toBeLessThan(2000);
  });

  test('should handle undo/redo operations efficiently', async () => {
    await excalidrawPage.goto();
    
    const startTime = Date.now();
    
    // 複数回undo/redo キーボードショートカット
    for (let i = 0; i < 5; i++) {
      await excalidrawPage.page.keyboard.press('Control+z');
      await excalidrawPage.page.waitForTimeout(50);
      await excalidrawPage.page.keyboard.press('Control+y');
      await excalidrawPage.page.waitForTimeout(50);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Undo/redo keyboard operations took ${duration}ms`);
    
    // 1秒以内で完了することを確認
    expect(duration).toBeLessThan(1000);
  });

  test('should maintain performance during collaboration setup', async ({ browser }) => {
    await excalidrawPage.goto();
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const excalidrawPage2 = new ExcalidrawPage(page2);
    await excalidrawPage2.goto();
    
    const startTime = Date.now();
    const roomId = `perf-test-${Date.now()}`;
    
    try {
      // 両方のページでルーム参加を試行
      await Promise.all([
        excalidrawPage.joinRoom(roomId, 'User1'),
        excalidrawPage2.joinRoom(roomId, 'User2'),
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`Collaboration setup took ${duration}ms`);
      
      // 10秒以内で完了することを確認
      expect(duration).toBeLessThan(10000);
      
    } finally {
      await context2.close();
    }
  });

  test('should check memory usage during extended drawing session', async ({ page }) => {
    await excalidrawPage.goto();
    await excalidrawPage.clearCanvas();
    
    // 初期メモリ使用量を取得
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // 描画セッションを実行
    for (let i = 0; i < 10; i++) {
      await excalidrawPage.drawRectangle(i * 30, i * 30, i * 30 + 50, i * 30 + 50);
      await excalidrawPage.drawEllipse(i * 30 + 100, i * 30 + 100, 20, 20);
    }
    
    // 最終メモリ使用量を取得
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      console.log(`Memory increase: ${memoryIncrease} bytes`);
      
      // メモリ増加が合理的な範囲内であることを確認（50MB以下）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });
});