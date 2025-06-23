import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false, // WebSocketの競合を避けるため
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 同時実行を制限
  reporter: [['html', { outputFolder: 'playwright-report-integration' }]],
  timeout: 120000, // 統合テストは時間がかかるため延長
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Docker Compose環境の起動は外部で行う
  // webServerの設定は使用しない
});