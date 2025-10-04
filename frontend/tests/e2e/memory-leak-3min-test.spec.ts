import { test, expect, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ExcalidrawPage } from './pages/excalidraw-page';

// 3分間の短縮版メモリリークテスト
const TEST_DURATION_MS = 3 * 60 * 1000; // 3分
const MEASUREMENT_INTERVAL_MS = 30 * 1000; // 30秒ごとに測定

interface MemoryMetrics {
  timestamp: number;
  elapsed: string;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  domNodeCount: number;
  user: string;
}

interface TestReport {
  duration: string;
  startTime: string;
  endTime: string;
  initialMemory: {
    user1: number;
    user2: number;
  };
  finalMemory: {
    user1: number;
    user2: number;
  };
  memoryIncrease: {
    user1: number;
    user2: number;
  };
  peakMemory: {
    user1: number;
    user2: number;
  };
  samples: MemoryMetrics[];
  verdict: 'PASS' | 'FAIL';
  failureReasons?: string[];
}

test.describe('3-Minute Memory Leak Test', () => {
  test.setTimeout(5 * 60 * 1000); // 5分のタイムアウト

  test('should not leak memory during 3 minutes of collaborative editing', async ({ browser }, testInfo) => {
    const startTime = Date.now();
    const report: TestReport = {
      duration: '3 minutes',
      startTime: new Date(startTime).toISOString(),
      endTime: '',
      initialMemory: { user1: 0, user2: 0 },
      finalMemory: { user1: 0, user2: 0 },
      memoryIncrease: { user1: 0, user2: 0 },
      peakMemory: { user1: 0, user2: 0 },
      samples: [],
      verdict: 'PASS',
      failureReasons: []
    };

    // 2つのブラウザコンテキストを作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // メモリ測定ヘルパー関数
    const measureMemory = async (page: Page, user: string): Promise<MemoryMetrics> => {
      const metrics = await page.evaluate(() => {
        const perf = performance as any;
        return {
          usedJSHeapSize: perf.memory?.usedJSHeapSize || 0,
          totalJSHeapSize: perf.memory?.totalJSHeapSize || 0,
          domNodeCount: document.querySelectorAll('*').length,
        };
      });

      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      return {
        timestamp: Date.now(),
        elapsed: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        user,
        ...metrics
      };
    };

    // ランダムな描画操作（実際に図形を描画）
    const performDrawing = async (excalidrawPage: ExcalidrawPage, count: number) => {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 400 + 100;
        const y = Math.random() * 300 + 100;
        const width = Math.random() * 100 + 50;
        const height = Math.random() * 100 + 50;

        // ランダムに矩形か楕円を描画
        if (Math.random() > 0.5) {
          await excalidrawPage.drawRectangle(x, y, x + width, y + height);
        } else {
          await excalidrawPage.drawEllipse(x + width/2, y + height/2, width/2, height/2);
        }

        // 描画間隔を少し短くして効率化
        await excalidrawPage.page.waitForTimeout(100);
      }
    };

    try {
      console.log('Starting 3-minute memory leak test...');
      console.log('=' .repeat(60));

      // ======== Phase 1: 初期設定（0-30秒） ========
      console.log('\n[Phase 1] Initial setup (0:00-0:30)');

      // 両ユーザーがアプリを起動
      await Promise.all([
        page1.goto('http://localhost:3000'),
        page2.goto('http://localhost:3000')
      ]);

      // アプリケーションの読み込みを待つ
      await page1.waitForSelector('canvas', { timeout: 10000 });
      await page2.waitForSelector('canvas', { timeout: 10000 });

      // ExcalidrawPageインスタンスを作成
      const excalidrawPage1 = new ExcalidrawPage(page1);
      const excalidrawPage2 = new ExcalidrawPage(page2);

      // 既存のダイアログを閉じる
      for (const page of [page1, page2]) {
        const dialogVisible = await page.locator('.room-dialog-overlay').isVisible().catch(() => false);
        if (dialogVisible) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }

      // ルームに参加
      const roomId = `test-3min-${Date.now()}`;
      console.log(`  Joining room: ${roomId}`);

      // User1がルームに参加
      await page1.locator('button:has-text("Share")').click();
      await page1.waitForTimeout(500);

      const roomIdInput1 = page1.locator('.room-dialog-overlay input[type="text"]').first();
      const usernameInput1 = page1.locator('.room-dialog-overlay input[type="text"]').nth(1);
      await roomIdInput1.fill(roomId);
      await usernameInput1.fill('User1');
      await page1.locator('.room-dialog-overlay button.primary-button:has-text("Join Room")').click();
      await page1.waitForTimeout(2000);

      // User2がルームに参加
      await page2.locator('button:has-text("Share")').click();
      await page2.waitForTimeout(500);

      const roomIdInput2 = page2.locator('.room-dialog-overlay input[type="text"]').first();
      const usernameInput2 = page2.locator('.room-dialog-overlay input[type="text"]').nth(1);
      await roomIdInput2.fill(roomId);
      await usernameInput2.fill('User2');
      await page2.locator('.room-dialog-overlay button.primary-button:has-text("Join Room")').click();
      await page2.waitForTimeout(2000);

      // 初期メモリを記録
      const initialMetrics1 = await measureMemory(page1, 'User1');
      const initialMetrics2 = await measureMemory(page2, 'User2');
      report.initialMemory.user1 = initialMetrics1.usedJSHeapSize;
      report.initialMemory.user2 = initialMetrics2.usedJSHeapSize;
      report.samples.push(initialMetrics1, initialMetrics2);

      const initialElementCount1 = await excalidrawPage1.getElementsCount();
      const initialElementCount2 = await excalidrawPage2.getElementsCount();

      console.log(`  Initial memory - User1: ${(initialMetrics1.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Initial memory - User2: ${(initialMetrics2.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  DOM nodes - User1: ${initialMetrics1.domNodeCount}, User2: ${initialMetrics2.domNodeCount}`);
      console.log(`  Initial elements - User1: ${initialElementCount1}, User2: ${initialElementCount2}`);

      // ======== Phase 2: アクティブな操作（30秒-2分30秒） ========
      console.log('\n[Phase 2] Active operations (0:30-2:30)');

      // 30秒ごとに操作と測定を実施
      for (let interval = 1; interval <= 4; interval++) {
        const intervalStart = Date.now();
        console.log(`  Interval ${interval}/4 starting...`);

        // 並行して描画操作を実行
        await Promise.all([
          performDrawing(excalidrawPage1, 5),
          performDrawing(excalidrawPage2, 5)
        ]);

        // 描画要素数を確認
        const elementCount1 = await excalidrawPage1.getElementsCount();
        const elementCount2 = await excalidrawPage2.getElementsCount();
        console.log(`    Elements drawn - User1: ${elementCount1}, User2: ${elementCount2}`);

        // キーボード操作
        for (let i = 0; i < 3; i++) {
          await page1.keyboard.press('r'); // 矩形ツール
          await page2.keyboard.press('o'); // 円ツール
          await page1.waitForTimeout(100);
        }

        // Undo/Redo操作
        for (let i = 0; i < 2; i++) {
          await page1.keyboard.press('Control+z');
          await page2.keyboard.press('Control+z');
          await page1.waitForTimeout(50);
        }
        for (let i = 0; i < 2; i++) {
          await page1.keyboard.press('Control+y');
          await page2.keyboard.press('Control+y');
          await page1.waitForTimeout(50);
        }

        // メモリを測定
        const metrics1 = await measureMemory(page1, 'User1');
        const metrics2 = await measureMemory(page2, 'User2');
        report.samples.push(metrics1, metrics2);

        // ピークメモリを更新
        report.peakMemory.user1 = Math.max(report.peakMemory.user1, metrics1.usedJSHeapSize);
        report.peakMemory.user2 = Math.max(report.peakMemory.user2, metrics2.usedJSHeapSize);

        console.log(`    [${metrics1.elapsed}] User1: ${(metrics1.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB (${metrics1.domNodeCount} nodes)`);
        console.log(`    [${metrics2.elapsed}] User2: ${(metrics2.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB (${metrics2.domNodeCount} nodes)`);

        // 30秒待機
        const elapsed = Date.now() - intervalStart;
        const waitTime = MEASUREMENT_INTERVAL_MS - elapsed;
        if (waitTime > 0) {
          await page1.waitForTimeout(waitTime);
        }
      }

      // ======== Phase 3: 最終確認（2分30秒-3分） ========
      console.log('\n[Phase 3] Final verification (2:30-3:00)');

      // すべての要素をクリア
      await page1.keyboard.press('Control+a');
      await page1.keyboard.press('Delete');
      await page1.waitForTimeout(2000);

      // ガベージコレクションを促す（可能な場合）
      await page1.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      await page2.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      await page1.waitForTimeout(5000);

      // 最終メモリを測定
      const finalMetrics1 = await measureMemory(page1, 'User1');
      const finalMetrics2 = await measureMemory(page2, 'User2');
      report.finalMemory.user1 = finalMetrics1.usedJSHeapSize;
      report.finalMemory.user2 = finalMetrics2.usedJSHeapSize;
      report.samples.push(finalMetrics1, finalMetrics2);

      const finalElementCount1 = await excalidrawPage1.getElementsCount();
      const finalElementCount2 = await excalidrawPage2.getElementsCount();

      console.log(`  Final memory - User1: ${(finalMetrics1.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final memory - User2: ${(finalMetrics2.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final elements - User1: ${finalElementCount1}, User2: ${finalElementCount2}`);

      // メモリ増加を計算
      report.memoryIncrease.user1 = report.finalMemory.user1 - report.initialMemory.user1;
      report.memoryIncrease.user2 = report.finalMemory.user2 - report.initialMemory.user2;

      const increasePercentUser1 = (report.memoryIncrease.user1 / report.initialMemory.user1) * 100;
      const increasePercentUser2 = (report.memoryIncrease.user2 / report.initialMemory.user2) * 100;

      console.log(`\n[Results]`);
      console.log(`  Memory increase - User1: ${(report.memoryIncrease.user1 / 1024 / 1024).toFixed(2)}MB (${increasePercentUser1.toFixed(1)}%)`);
      console.log(`  Memory increase - User2: ${(report.memoryIncrease.user2 / 1024 / 1024).toFixed(2)}MB (${increasePercentUser2.toFixed(1)}%)`);
      console.log(`  Peak memory - User1: ${(report.peakMemory.user1 / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Peak memory - User2: ${(report.peakMemory.user2 / 1024 / 1024).toFixed(2)}MB`);

      // 成功条件の判定
      const failureReasons = [];

      // メモリ増加率チェック（初期値の50%以内）
      if (increasePercentUser1 > 50) {
        failureReasons.push(`User1 memory increased by ${increasePercentUser1.toFixed(1)}% (limit: 50%)`);
      }
      if (increasePercentUser2 > 50) {
        failureReasons.push(`User2 memory increased by ${increasePercentUser2.toFixed(1)}% (limit: 50%)`);
      }

      // 絶対増加量チェック（30MB以内）
      const maxIncreaseBytes = 30 * 1024 * 1024;
      if (report.memoryIncrease.user1 > maxIncreaseBytes) {
        failureReasons.push(`User1 memory increased by ${(report.memoryIncrease.user1 / 1024 / 1024).toFixed(2)}MB (limit: 30MB)`);
      }
      if (report.memoryIncrease.user2 > maxIncreaseBytes) {
        failureReasons.push(`User2 memory increased by ${(report.memoryIncrease.user2 / 1024 / 1024).toFixed(2)}MB (limit: 30MB)`);
      }

      // 最終判定
      if (failureReasons.length > 0) {
        report.verdict = 'FAIL';
        report.failureReasons = failureReasons;
      }

      // レポート完成
      report.endTime = new Date().toISOString();

      // レポートを保存
      const reportPath = testInfo.outputPath('memory-3min-report.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\nReport saved to: ${reportPath}`);

      // スクリーンショットを保存
      await page1.screenshot({ path: testInfo.outputPath('3min-test-user1-final.png'), fullPage: true });
      await page2.screenshot({ path: testInfo.outputPath('3min-test-user2-final.png'), fullPage: true });

      // 結果サマリー
      console.log('\n' + '='.repeat(60));
      console.log('3-MINUTE TEST COMPLETED');
      console.log('=' .repeat(60));
      console.log(`Verdict: ${report.verdict}`);
      if (report.failureReasons && report.failureReasons.length > 0) {
        console.log('Failure reasons:');
        report.failureReasons.forEach(reason => console.log(`  - ${reason}`));
      }
      console.log('=' .repeat(60));

      // アサーション
      expect(report.verdict).toBe('PASS');

    } finally {
      // クリーンアップ
      await context1.close();
      await context2.close();
    }
  });
});