import { defineConfig, devices } from "@playwright/test";

/**
 * The site claims its author writes Playwright suites for a living.
 * This is that suite, pointed at this site.
 */

const PORT = process.env.PORT ?? "3100";
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

/**
 * Point BASE_URL at a deployed origin to smoke-test it:
 *   BASE_URL=https://portfolio-nine-woad-35.vercel.app npx playwright test
 * No local server is started in that case.
 */
const isRemote = !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseURL);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // A stray `test.only` must never silently shrink the suite in CI.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: isCI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "test-results/results.json" }],
      ]
    : [["list"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    // Responsive layout has already regressed once (grid overflow, clipped
    // suggestion chips). It gets its own project.
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],

  webServer: isRemote
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        env: { PORT: String(PORT) },
      },
});
