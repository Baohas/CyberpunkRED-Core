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
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
