import { defineConfig, devices } from "@playwright/test";

/**
 * Accessibility / keyboard checks (Plan.md Phase 5). Not part of the Vercel build.
 *
 *   npm run build && npm run start -- -p 3200   # production server, in another shell
 *   npm run test:e2e
 *
 * E2E_BASE_URL   target (default http://localhost:3200)
 * E2E_CHANNEL    set to "chrome" to use the installed Google Chrome instead of
 *                Playwright's bundled Chromium (skips `npx playwright install`)
 * E2E_PRODUCT_SLUG  product page to test (default: first active product from /api/products)
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  retries: 0,
  timeout: 60_000, // networkidle on a catalog page with remote product images can exceed 30 s on a cold server
  workers: 2,
  reporter: [["list"], ["json", { outputFile: "e2e-results/results.json" }]],
  outputDir: "e2e-results/artifacts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3200",
    ...devices["Desktop Chrome"],
    channel: process.env.E2E_CHANNEL || undefined,
    // The consent banner is a dialog-like region; tests that need it dismiss it themselves.
    trace: "retain-on-failure",
  },
});
