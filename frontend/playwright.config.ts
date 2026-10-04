import {defineConfig, devices} from "@playwright/test";

// Expects the backend on :4000 (cd backend && bun run dev). Starts the web app if needed.
export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [
    {name: "setup", testMatch: /auth\.setup\.ts/},
    {dependencies: ["setup"], name: "chromium", use: {...devices["Desktop Chrome"]}},
  ],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8093",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run web",
    reuseExistingServer: true,
    timeout: 180_000,
    url: "http://localhost:8093",
  },
  workers: 1,
});
