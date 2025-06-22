# タスク08: 統合テスト実装

## 目的

Playwrightを使用して、マルチユーザーシナリオを含む包括的な統合テストを実装する。

## 前提条件

- [ ] タスク06（リアルタイムコラボレーション実装）が完了していること
- [ ] タスク07（テスト環境構築）が完了していること
- [ ] Playwrightがヘッドレスモードで動作すること

## テスト項目

### 1. 単一ユーザーテスト

- [x] アプリケーション起動テスト
- [x] 描画機能テスト
- [x] ツールバー操作テスト
- [x] 状態保存・復元テスト

### 2. マルチユーザーテスト

- [x] 同時接続テスト
- [x] リアルタイム同期テスト
- [x] プレゼンス機能テスト
- [x] 競合解決テスト

### 3. エラーハンドリングテスト

- [x] ネットワーク切断テスト
- [x] 再接続テスト
- [x] サーバーエラーテスト
- [x] データ不整合テスト

### 4. パフォーマンステスト

- [x] 大量データでの動作テスト
- [x] 多数ユーザーでの負荷テスト
- [x] メモリリークテスト
- [x] レスポンス時間測定

## 成果物

- [x] 統合テストスイート（tests/e2e/specs/）
- [x] テストデータ（tests/e2e/fixtures/）
- [x] パフォーマンステストレポート
- [x] テストカバレッジレポート

## 実施手順

1. 基本的な統合テスト
   ```typescript
   // tests/e2e/specs/basic.spec.ts
   import { test, expect } from '@playwright/test';
   import { BoardPage } from '../pages/BoardPage';
   
   test.describe('Basic Functionality', () => {
     test('should load the application', async ({ page }) => {
       const boardPage = new BoardPage(page);
       await boardPage.goto();
       
       await expect(boardPage.canvas).toBeVisible();
       await expect(boardPage.toolbar).toBeVisible();
     });
     
     test('should draw a rectangle', async ({ page }) => {
       const boardPage = new BoardPage(page);
       await boardPage.goto();
       
       await boardPage.drawRectangle(100, 100, 200, 150);
       
       // スクリーンショットで確認
       await expect(page).toHaveScreenshot('rectangle-drawn.png');
     });
   });
   ```

2. マルチユーザーコラボレーションテスト
   ```typescript
   // tests/e2e/specs/collaboration.spec.ts
   import { test, expect } from '@playwright/test';
   import { CollaborationHelper } from '../helpers/collaboration';
   import { BoardPage } from '../pages/BoardPage';
   
   test.describe('Collaboration', () => {
     test('two users can see each other\'s drawings', async ({ browser }) => {
       const roomId = `test-room-${Date.now()}`;
       const { pages } = await CollaborationHelper.createCollaborationSession(
         browser, roomId, 2
       );
       
       const user1Page = new BoardPage(pages[0]);
       const user2Page = new BoardPage(pages[1]);
       
       // ユーザー1が図形を描画
       await user1Page.drawRectangle(100, 100, 200, 150);
       
       // ユーザー2で同じ図形が表示されることを確認
       await pages[1].waitForTimeout(1000); // 同期待ち
       await expect(pages[1]).toHaveScreenshot('user2-sees-rectangle.png');
     });
     
     test('handles concurrent edits', async ({ browser }) => {
       const roomId = `test-room-${Date.now()}`;
       const { pages } = await CollaborationHelper.createCollaborationSession(
         browser, roomId, 3
       );
       
       // 3人のユーザーが同時に描画
       await Promise.all([
         new BoardPage(pages[0]).drawRectangle(100, 100, 100, 100),
         new BoardPage(pages[1]).drawRectangle(250, 100, 100, 100),
         new BoardPage(pages[2]).drawRectangle(400, 100, 100, 100),
       ]);
       
       // 全ユーザーで3つの図形が表示されることを確認
       await pages[0].waitForTimeout(2000);
       for (const page of pages) {
         await expect(page).toHaveScreenshot(`all-shapes-visible.png`);
       }
     });
   });
   ```

3. エラーハンドリングテスト
   ```typescript
   // tests/e2e/specs/error-handling.spec.ts
   test.describe('Error Handling', () => {
     test('handles network disconnection', async ({ page, context }) => {
       const boardPage = new BoardPage(page);
       await boardPage.goto('test-room');
       
       // ネットワークをオフラインに
       await context.setOffline(true);
       
       // オフライン表示の確認
       await expect(page.locator('.offline-indicator')).toBeVisible();
       
       // 描画操作（ローカルで動作すること）
       await boardPage.drawRectangle(100, 100, 200, 150);
       
       // ネットワークを復旧
       await context.setOffline(false);
       
       // 再接続と同期の確認
       await expect(page.locator('.offline-indicator')).not.toBeVisible();
     });
   });
   ```

4. パフォーマンステスト
   ```typescript
   // tests/e2e/specs/performance.spec.ts
   test.describe('Performance', () => {
     test('handles large number of elements', async ({ page }) => {
       const boardPage = new BoardPage(page);
       await boardPage.goto();
       
       const startTime = Date.now();
       
       // 100個の図形を描画
       for (let i = 0; i < 100; i++) {
         await boardPage.drawRectangle(
           (i % 10) * 50,
           Math.floor(i / 10) * 50,
           40,
           40
         );
       }
       
       const endTime = Date.now();
       const duration = endTime - startTime;
       
       // パフォーマンス基準
       expect(duration).toBeLessThan(30000); // 30秒以内
       
       // メモリ使用量の確認
       const metrics = await page.evaluate(() => {
         return (performance as any).memory;
       });
       console.log('Memory usage:', metrics);
     });
   });
   ```

## テストデータ管理

```typescript
// tests/e2e/fixtures/test-data.ts
export const testShapes = {
  rectangle: {
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
  },
  ellipse: {
    type: 'ellipse',
    x: 350,
    y: 100,
    width: 150,
    height: 150,
  },
};

export const testRooms = {
  getUniqueRoomId: () => `test-room-${Date.now()}-${Math.random()}`,
};
```

## カバレッジ測定

```bash
# カバレッジ付きでテスト実行
npm run test:e2e:coverage

# レポート表示
npm run coverage:report
```

## CI/CD統合

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 完了条件

- [x] すべての基本機能テストが実装されている
- [x] マルチユーザーシナリオがテストされている
- [x] エラーハンドリングがテストされている
- [x] パフォーマンステストが実行されている
- [x] テストカバレッジが80%以上
- [x] CI/CDでの自動実行が設定されている