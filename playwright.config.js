import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Lumina Reader E2E tests
 *
 * Note: Electron testing requires special setup using the electron-player
 * or by testing the web app in chromium mode during development.
 *
 * For full Electron E2E testing, consider using:
 * - https://github.com/jtbandes/playwright-electron
 * - Or test the renderer in web mode with `npm run dev`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Electron apps are single-instance
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  }
})
