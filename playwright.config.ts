import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { loadEnvFiles } from "./e2e/helpers/loadEnv";

// Load local secrets for auth-gated tests (gitignored)
loadEnvFiles([
  path.resolve(".env.local"),
  path.resolve(".env.e2e.local"),
]);

// Prefer 3005 — 3000 is often occupied by other local proxies on this machine.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://baca.staging.publiora.biz.id";
const port = new URL(baseURL).port || "3005";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Keep memory low on constrained Windows agents.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Staging uses publicly trusted TLS certificates (ZeroSSL) - no insecure overrides needed
    ignoreHTTPSErrors: false,
    acceptDownloads: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    // Disabled for staging tests - we test against deployed staging.publiora.biz.id
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=2048",
    },
  },
});
