import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests against the production images, started by scripts/e2e.sh:
 * the app on :3000 and the Firebase Auth emulator on :9099, both on
 * localhost (the test container shares the emulator's network namespace).
 *
 * `bypassCSP`: the images are the ones that ship, built without the emulator
 * in their Content-Security-Policy, so the browser would refuse to reach
 * localhost:9099. The headers themselves are checked by scripts/smoke-test.sh.
 */
export default defineConfig({
  testDir: "./tests",
  // One app, one database: tests create their own accounts, but running
  // them one at a time keeps the Pi-sized container's memory honest too.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    bypassCSP: true,
    locale: "en-GB",
    timezoneId: "Europe/Lisbon",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
