import { defineConfig, devices } from "@playwright/test";
import { resolveConfig, STORAGE_STATE } from "../tools/foundry-server/config.mjs";

// Resolve the port/url the same way the launcher does so baseURL always matches
// the server setup starts. resolveConfig() throws if appPath/dataPath are
// unset, which is the correct early failure for an unconfigured checkout.
const { url } = resolveConfig();

export default defineConfig({
  // This config lives in .playwright/, so paths are relative to that dir.
  testDir: "../tests/e2e",
  // Keep on-disk artifacts here in .playwright/ (RUN_DIR in
  // tools/foundry-server/config.mjs and the MCP outputDir do the same).
  outputDir: "./test-results",
  // One Foundry server + one world is shared by every spec, so tests cannot run
  // in parallel against it.
  fullyParallel: false,
  workers: 1,
  // setup launches Foundry, drives the gates, creates+launches the
  // ephemeral world and saves the GM auth state; teardown stops Foundry
  // (releasing LevelDB locks) and deletes the world.
  globalSetup: "../tests/e2e/setup.mjs",
  globalTeardown: "../tests/e2e/teardown.mjs",
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: url,
    storageState: STORAGE_STATE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Foundry's UI needs at least 1920x1080 — the device presets default to
    // 1280x720, which is too small (it parks the docked sidebar/dialogs awkwardly
    // and can push controls off-canvas). Override the viewport after the device
    // spread so it takes precedence.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
