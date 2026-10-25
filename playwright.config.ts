import { defineConfig, devices } from "@playwright/test";
const baseURL = (process.env.TEST_BASE_URL || "http://localhost:3000").replace(/\/$/, "") + "/";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 12000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "reports/browser-results.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    actionTimeout: 15000,
    navigationTimeout: 20000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    acceptDownloads: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: process.env.EXTERNAL_TEST_SERVER
    ? undefined
    : {
        command: "node scripts/serve.mjs --port 3000",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 20000,
      },
});
