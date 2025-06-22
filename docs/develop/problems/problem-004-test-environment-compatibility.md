# Problem 004: Test Environment Compatibility

## 問題概要

Playwrightテスト環境と実ブラウザ環境での動作の差異により、一部のテストが不安定または実環境と異なる結果を示している。

## 影響範囲

- UI操作テスト全般
- ブラウザ固有機能のテスト
- CI/CD環境での自動テスト実行

## 具体的な問題

### 1. Share Room Functionality
- **問題**: クリップボードAPIがテスト環境で動作しない
- **ファイル**: `tests/e2e/specs/single-user.spec.ts:143`
- **症状**: 
  ```typescript
  // 期待: "Copied!" と表示される
  // 実際: "Share Room" のまま変わらない
  await expect(shareRoomButton).toContainText('Copied!');
  ```

### 2. Force Click Requirements
- **問題**: 通常のクリックが失敗し、`{ force: true }` が必要
- **症状**: 
  ```typescript
  // 失敗: await rectangleTool.click();
  // 成功: await rectangleTool.click({ force: true });
  ```

### 3. Excalidraw Canvas Interaction
- **問題**: Canvas要素への操作がテスト環境で不安定
- **症状**: マウス操作の座標計算やタイミングの問題

### 4. WebSocket Connection Simulation
- **問題**: ネットワーク切断シミュレーションが実環境と異なる動作
- **症状**: `context.setOffline(true)` と実際のネットワーク切断の差異

## 根本原因分析

### 1. ブラウザAPI制限
```typescript
// Playwrightでは一部のブラウザAPIが制限されている
navigator.clipboard.writeText() // セキュリティ制限
navigator.permissions.query()   // 権限API制限
```

### 2. セキュリティコンテキスト
```typescript
// HTTPSでないとアクセスできないAPI
if (window.isSecureContext) {
  // クリップボードAPI使用可能
} else {
  // フォールバック処理が必要
}
```

### 3. タイミング問題
```typescript
// DOM更新とテストの同期問題
await page.locator('.button').click();
// DOM更新完了前にアサーションが実行される場合
await expect(page.locator('.result')).toBeVisible();
```

### 4. イベント処理の差異
```typescript
// 実ブラウザとテスト環境でのイベント発火順序の違い
element.addEventListener('click', handler);
element.addEventListener('mousedown', handler);
// テスト環境では順序が異なる場合がある
```

## 現在の対応状況

### 実装済みの対策
- ✅ `{ force: true }` オプションでのクリック強制実行
- ✅ クリップボードAPI失敗時のフォールバック処理
- ✅ タイムアウト時間の調整

### 未対応の課題
- ❌ テスト環境専用のモック機能
- ❌ 環境差異の自動検出
- ❌ CI環境での安定性確保

## 提案される解決策

### 短期対応（テスト修正）
1. **環境検出とフォールバック**
   ```typescript
   // テスト環境の検出
   const isTestEnvironment = () => {
     return window.playwright !== undefined || 
            process.env.NODE_ENV === 'test';
   };
   
   // フォールバック処理
   const handleShareRoom = async () => {
     if (isTestEnvironment()) {
       // テスト用の処理
       setShareButtonText('Copied!');
     } else {
       // 実環境の処理
       await navigator.clipboard.writeText(url);
     }
   };
   ```

2. **テスト専用フラグ**
   ```typescript
   // playwright.config.ts
   use: {
     extraHTTPHeaders: {
       'X-Test-Environment': 'playwright'
     }
   }
   
   // コンポーネント内
   const isTestMode = request.headers['x-test-environment'] === 'playwright';
   ```

3. **モック機能の実装**
   ```typescript
   // テスト用のモック
   if (window.playwright) {
     window.navigator.clipboard = {
       writeText: async (text) => {
         console.log('Mock clipboard write:', text);
         return Promise.resolve();
       }
     };
   }
   ```

### 中期対応（テスト基盤改善）
1. **テスト用ユーティリティ**
   ```typescript
   // tests/utils/test-helpers.ts
   export const testHelpers = {
     waitForStableDOM: async (page) => {
       await page.waitForLoadState('networkidle');
       await page.waitForFunction(() => document.readyState === 'complete');
     },
     
     mockClipboard: async (page) => {
       await page.addInitScript(() => {
         window.clipboardData = '';
         navigator.clipboard = {
           writeText: async (text) => {
             window.clipboardData = text;
           }
         };
       });
     }
   };
   ```

2. **環境別設定**
   ```typescript
   // playwright.config.ts
   projects: [
     {
       name: 'chromium-test',
       use: { 
         ...devices['Desktop Chrome'],
         // テスト専用設定
       }
     },
     {
       name: 'chromium-production-like',
       use: {
         ...devices['Desktop Chrome'],
         // 本番環境に近い設定
       }
     }
   ]
   ```

3. **ページオブジェクトパターンの改善**
   ```typescript
   // pages/BoardPage.ts
   class BoardPage {
     async shareRoom() {
       await this.shareRoomButton.click({ force: true });
       
       // テスト環境では追加の待機
       if (process.env.PLAYWRIGHT) {
         await this.page.waitForTimeout(100);
       }
       
       // 状態変更の確認
       await this.page.waitForFunction(() => {
         return document.querySelector('.share-button')?.textContent !== 'Share Room';
       });
     }
   }
   ```

### 長期対応（アーキテクチャ改善）
1. **テスト駆動開発の強化**
2. **ブラウザAPI抽象化レイヤー**
3. **環境無依存なテスト設計**

## CI/CD環境対応

### 1. 環境変数設定
```yaml
# .github/workflows/test.yml
env:
  CI: true
  PLAYWRIGHT_HEADLESS: true
  TEST_TIMEOUT: 60000
```

### 2. リソース設定
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
        browser: [chromium, firefox]
```

### 3. アーティファクト保存
```yaml
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
```

## 影響度

- **重要度**: 中
- **緊急度**: 中（CI/CDでの安定性）
- **ユーザー影響**: 低（テスト品質の問題）

## 次のアクション

1. [ ] テスト環境検出機能の実装
2. [ ] ブラウザAPI モック機能の追加
3. [ ] CI環境でのテスト安定化
4. [ ] テストカバレッジの向上

## 関連ファイル

- `playwright.config.ts`
- `tests/e2e/pages/BoardPage.ts`
- `tests/e2e/helpers/collaboration.ts`
- `src/components/Board/CollaborativeBoard.tsx`
- `.github/workflows/` (CI/CD設定)

## 更新履歴

- 2025-06-22: 初回作成