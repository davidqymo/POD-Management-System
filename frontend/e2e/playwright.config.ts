import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './spec',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview --prefix ../',  // assumes frontend package.json exists
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
