import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for PNNCLE automation tests
 */
export default defineConfig({
  testDir: './tests-ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['list']
  ],
  use: {
    baseURL: 'https://pnncle.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: 'test-results/',
});

