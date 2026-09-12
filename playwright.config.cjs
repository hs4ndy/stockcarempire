const { defineConfig } = require('playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  // Real WebGL tests include 45 RAF samples plus multiple screenshots.
  // Software-rendered Chromium can need more than 30 seconds for a full field.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.STOCKCAR_BASE_URL || 'http://127.0.0.1:4174',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.STOCKCAR_BASE_URL ? undefined : {
    command: 'node test/static-server.cjs',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
