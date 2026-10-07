import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: '**/iphone.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
        launchOptions: { executablePath },
      },
    },
    {
      name: 'mobile',
      testIgnore: '**/iphone.spec.ts',
      use: { ...devices['Pixel 7'], launchOptions: { executablePath } },
    },
    {
      name: 'iphone',
      testMatch: ['**/iphone.spec.ts', '**/cloud.spec.ts'],
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
  ],
  webServer: [
    {
      command: 'npm run build:server && npm start',
      url: 'http://127.0.0.1:3000/api/health',
      env: {
        DATA_DIR: 'var/e2e',
        ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
