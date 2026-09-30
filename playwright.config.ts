import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/agent-operations-console-demo/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run demo',
    url: 'http://127.0.0.1:4173/agent-operations-console-demo/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-1920', use: { ...devices['Desktop Chrome HiDPI'], viewport: { width: 1920, height: 1080 } } },
  ],
})
