import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the real app with INTEGRATIONS_DRIVER=memory, so the whole journey
 * (browse → cart → Google sign-in → checkout → order → confirmation) works without any
 * Supabase, Google or Mailgun credentials.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
// `localhost` (not 127.0.0.1): Next 16 blocks its dev assets for cross-origin hosts, which would
// stop client-side hydration and silently break the interactive parts of the app.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Values here win over .env files, so the tests never touch a real Supabase/Mailgun project.
    command: `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      INTEGRATIONS_DRIVER: "memory",
      NEXT_PUBLIC_APP_URL: baseURL,
      STORE_NAME: "Northline",
      STORE_SUPPORT_EMAIL: "support@example.com",
      // Its own build directory, so a `next dev` already running in the repo is untouched.
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});