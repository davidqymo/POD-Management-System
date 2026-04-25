import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd ../../backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev',
      port: 8080,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'cd .. && npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});