import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  outputDir: './test-results',
  timeout: 30000, // 30秒タイムアウト
  expect: {
    timeout: 10000, // アサーションタイムアウト
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: 'performance.spec.ts', // FirefoxでPerfテストをスキップ
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: 'performance.spec.ts', // WebKitでPerfテストをスキップ
    },
    {
      name: 'stress-test',
      use: {
        ...devices['Desktop Chrome'],
        // メモリ測定を有効化するための追加フラグ
        launchOptions: {
          args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
        },
      },
      timeout: 1800000, // 30分
      testMatch: 'memory-leak-stress-test.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
