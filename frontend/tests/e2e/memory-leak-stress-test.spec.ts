import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { ExcalidrawPage } from './pages/excalidraw-page';
import * as fs from 'fs';
import * as path from 'path';

// 30分間のストレステスト設定
const TEST_DURATION_MS = 30 * 60 * 1000; // 30分
const MEASUREMENT_INTERVAL_MS = 5 * 60 * 1000; // 5分ごとに測定
const OPERATION_CYCLE_MS = 5 * 60 * 1000; // 5分サイクル

interface MemoryMetrics {
  timestamp: number;
  elapsed: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  domNodeCount: number;
  elementCount: number;
  socketConnected: boolean;
  mapSize: number;
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

test.describe('30-Minute Memory Leak Stress Test', () => {
  test.setTimeout(TEST_DURATION_MS + 5 * 60 * 1000); // テスト時間 + 5分のバッファ

  test('should not leak memory during 30 minutes of collaborative editing', async ({ browser }) => {
    const startTime = Date.now();
    const report: TestReport = {
      duration: '30 minutes',
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

    const excalidraw1 = new ExcalidrawPage(page1);
    const excalidraw2 = new ExcalidrawPage(page2);

    // メモリ測定ヘルパー関数
    const measureMemory = async (page: Page, user: string): Promise<MemoryMetrics> => {
      const metrics = await page.evaluate(() => {
        const perf = performance as any;
        return {
          usedJSHeapSize: perf.memory?.usedJSHeapSize || 0,
          totalJSHeapSize: perf.memory?.totalJSHeapSize || 0,
          domNodeCount: document.querySelectorAll('*').length,
          elementCount: 0, // 後で設定
          socketConnected: (window as any).socketConnected || false,
          mapSize: 0 // 後で設定
        };
      });

      // Excalidraw要素数を取得
      metrics.elementCount = await excalidraw1.getElementsCount();

      // broadcastedElementVersions のサイズを取得
      try {
        metrics.mapSize = await page.evaluate(() => {
          const socket = (window as any).socket;
          if (socket && socket.socketService) {
            return socket.socketService.broadcastedElementVersions?.size || 0;
          }
          return 0;
        });
      } catch {
        metrics.mapSize = 0;
      }

      return {
        timestamp: Date.now(),
        elapsed: Date.now() - startTime,
        user,
        ...metrics
      };
    };

    // ランダムな描画操作
    const performRandomDrawing = async (excalidraw: ExcalidrawPage, count: number) => {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 800 + 100;
        const y = Math.random() * 400 + 100;
        const width = Math.random() * 100 + 50;
        const height = Math.random() * 100 + 50;

        const operation = Math.floor(Math.random() * 4);
        switch (operation) {
          case 0: // 矩形
            await excalidraw.drawRectangle(x, y, x + width, y + height);
            break;
          case 1: // 楕円
            await excalidraw.drawEllipse(x, y, width / 2, height / 2);
            break;
          case 2: // テキスト
            await excalidraw.addText(x, y, `Text ${i}`);
            break;
          case 3: // 矢印
            await excalidraw.selectTool('arrow');
            await excalidraw.canvas.click({ position: { x, y } });
            await excalidraw.page.mouse.down();
            await excalidraw.page.mouse.move(x + width, y + height);
            await excalidraw.page.mouse.up();
            break;
        }
        await excalidraw.page.waitForTimeout(100);
      }
    };

    try {
      console.log('Starting 30-minute memory leak stress test...');

      // Phase 1: 初期設定（0-2分）
      console.log('Phase 1: Initial setup...');

      // 両ユーザーがアプリを起動
      await Promise.all([
        excalidraw1.goto(),
        excalidraw2.goto()
      ]);

      // ルームに参加
      const roomId = `stress-test-${Date.now()}`;
      console.log(`Joining room: ${roomId}`);

      await excalidraw1.joinRoom(roomId, 'User1');
      await excalidraw2.joinRoom(roomId, 'User2');

      // 接続を確認
      await excalidraw1.page.waitForTimeout(3000);
      const connected1 = await excalidraw1.isConnected();
      const connected2 = await excalidraw2.isConnected();
      console.log(`Connection status - User1: ${connected1}, User2: ${connected2}`);

      // 初期メモリを記録
      const initialMetrics1 = await measureMemory(page1, 'User1');
      const initialMetrics2 = await measureMemory(page2, 'User2');
      report.initialMemory.user1 = initialMetrics1.usedJSHeapSize;
      report.initialMemory.user2 = initialMetrics2.usedJSHeapSize;
      report.samples.push(initialMetrics1, initialMetrics2);

      console.log(`Initial memory - User1: ${(initialMetrics1.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Initial memory - User2: ${(initialMetrics2.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);

      // Phase 2: 継続的操作（2-28分）
      console.log('Phase 2: Continuous operations for 26 minutes...');

      const cycleCount = Math.floor(26 / 5); // 5分サイクルを何回実行するか

      for (let cycle = 1; cycle <= cycleCount; cycle++) {
        const cycleStartTime = Date.now();
        console.log(`\nCycle ${cycle}/${cycleCount} starting...`);

        // Step 1: 描画操作（2分）
        console.log('  Step 1: Drawing operations...');
        const drawingPromises = [
          performRandomDrawing(excalidraw1, 20),
          performRandomDrawing(excalidraw2, 20)
        ];
        await Promise.race([
          Promise.all(drawingPromises),
          new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000))
        ]);

        // Step 2: 編集操作（1分）
        console.log('  Step 2: Edit operations...');

        // Undo/Redo操作
        for (let i = 0; i < 10; i++) {
          await excalidraw1.undo();
          await excalidraw2.undo();
          await excalidraw1.page.waitForTimeout(100);
        }
        for (let i = 0; i < 10; i++) {
          await excalidraw1.redo();
          await excalidraw2.redo();
          await excalidraw1.page.waitForTimeout(100);
        }

        // 要素の削除
        await excalidraw1.page.keyboard.press('Control+a');
        await excalidraw1.page.keyboard.press('Delete');
        await excalidraw1.page.waitForTimeout(1000);

        // Step 3: ルーム操作（1分）
        console.log('  Step 3: Room operations...');

        // User2が一時退出
        await excalidraw2.leaveRoom();
        await excalidraw2.page.waitForTimeout(5000);

        // User2が再参加
        await excalidraw2.joinRoom(roomId, 'User2');
        await excalidraw2.page.waitForTimeout(5000);

        // Step 4: メモリ監視（1分）
        console.log('  Step 4: Memory monitoring...');
        const metrics1 = await measureMemory(page1, 'User1');
        const metrics2 = await measureMemory(page2, 'User2');
        report.samples.push(metrics1, metrics2);

        // ピークメモリを更新
        report.peakMemory.user1 = Math.max(report.peakMemory.user1, metrics1.usedJSHeapSize);
        report.peakMemory.user2 = Math.max(report.peakMemory.user2, metrics2.usedJSHeapSize);

        console.log(`  Memory - User1: ${(metrics1.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, User2: ${(metrics2.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  DOM nodes - User1: ${metrics1.domNodeCount}, User2: ${metrics2.domNodeCount}`);
        console.log(`  Elements: ${metrics1.elementCount}`);
        console.log(`  Map size - User1: ${metrics1.mapSize}, User2: ${metrics2.mapSize}`);

        // 残り時間を待機
        const cycleElapsed = Date.now() - cycleStartTime;
        const waitTime = OPERATION_CYCLE_MS - cycleElapsed;
        if (waitTime > 0) {
          await excalidraw1.page.waitForTimeout(waitTime);
        }
      }

      // Phase 3: 最終確認（28-30分）
      console.log('\nPhase 3: Final verification...');

      // すべての要素をクリア
      await excalidraw1.clearCanvas();
      await excalidraw2.clearCanvas();
      await excalidraw1.page.waitForTimeout(5000);

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

      await excalidraw1.page.waitForTimeout(10000);

      // 最終メモリを測定
      const finalMetrics1 = await measureMemory(page1, 'User1');
      const finalMetrics2 = await measureMemory(page2, 'User2');
      report.finalMemory.user1 = finalMetrics1.usedJSHeapSize;
      report.finalMemory.user2 = finalMetrics2.usedJSHeapSize;
      report.samples.push(finalMetrics1, finalMetrics2);

      console.log(`\nFinal memory - User1: ${(finalMetrics1.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final memory - User2: ${(finalMetrics2.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);

      // メモリ増加を計算
      report.memoryIncrease.user1 = report.finalMemory.user1 - report.initialMemory.user1;
      report.memoryIncrease.user2 = report.finalMemory.user2 - report.initialMemory.user2;

      const increasePercentUser1 = (report.memoryIncrease.user1 / report.initialMemory.user1) * 100;
      const increasePercentUser2 = (report.memoryIncrease.user2 / report.initialMemory.user2) * 100;

      console.log(`\nMemory increase - User1: ${(report.memoryIncrease.user1 / 1024 / 1024).toFixed(2)}MB (${increasePercentUser1.toFixed(1)}%)`);
      console.log(`Memory increase - User2: ${(report.memoryIncrease.user2 / 1024 / 1024).toFixed(2)}MB (${increasePercentUser2.toFixed(1)}%)`);

      // 成功条件の判定
      const failureReasons = [];

      // メモリ増加率チェック（初期値の2倍以内）
      if (increasePercentUser1 > 100) {
        failureReasons.push(`User1 memory increased by ${increasePercentUser1.toFixed(1)}% (limit: 100%)`);
      }
      if (increasePercentUser2 > 100) {
        failureReasons.push(`User2 memory increased by ${increasePercentUser2.toFixed(1)}% (limit: 100%)`);
      }

      // 絶対増加量チェック（100MB以内）
      const maxIncreaseBytes = 100 * 1024 * 1024;
      if (report.memoryIncrease.user1 > maxIncreaseBytes) {
        failureReasons.push(`User1 memory increased by ${(report.memoryIncrease.user1 / 1024 / 1024).toFixed(2)}MB (limit: 100MB)`);
      }
      if (report.memoryIncrease.user2 > maxIncreaseBytes) {
        failureReasons.push(`User2 memory increased by ${(report.memoryIncrease.user2 / 1024 / 1024).toFixed(2)}MB (limit: 100MB)`);
      }

      // 最終判定
      if (failureReasons.length > 0) {
        report.verdict = 'FAIL';
        report.failureReasons = failureReasons;
      }

      // レポート完成
      report.endTime = new Date().toISOString();

      // レポートを保存
      const reportPath = path.join(__dirname, '../../test-results', 'memory-stress-report.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\nReport saved to: ${reportPath}`);

      // スクリーンショットを保存
      await page1.screenshot({ path: path.join(__dirname, '../../test-results', 'stress-test-user1-final.png'), fullPage: true });
      await page2.screenshot({ path: path.join(__dirname, '../../test-results', 'stress-test-user2-final.png'), fullPage: true });

      // アサーション
      expect(report.verdict).toBe('PASS');

    } finally {
      // クリーンアップ
      await context1.close();
      await context2.close();
    }

    // 最終結果の出力
    console.log('\n' + '='.repeat(80));
    console.log('30-MINUTE STRESS TEST COMPLETED');
    console.log('='.repeat(80));
    console.log(`Verdict: ${report.verdict}`);
    if (report.failureReasons && report.failureReasons.length > 0) {
      console.log('Failure reasons:');
      report.failureReasons.forEach(reason => console.log(`  - ${reason}`));
    }
    console.log('='.repeat(80));
  });
});