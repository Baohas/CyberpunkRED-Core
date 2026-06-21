import { defineConfig, devices } from "@playwright/test";
import {
  resolveConfig,
  STORAGE_STATE,
} from "../tools/foundry-server/config.mjs";

// Resolve the port/url the same way the launcher does so baseURL always matches
// the server setup starts. resolveConfig() throws if appPath/dataPath are
// unset, which is the correct early failure for an unconfigured checkout.
const { url } = resolveConfig();

export default defineConfig({
  // This config lives in .playwright/, so paths are relative to that dir.
  testDir: "../tests/browser",
  // Keep on-disk artifacts here in .playwright/ (RUN_DIR in
  // tools/foundry-server/config.mjs and the MCP outputDir do the same).
  outputDir: "./test-results",
  // One Foundry server + one world is shared by every spec, so tests cannot run
  // in parallel against it.
  fullyParallel: false,
  workers: 1,
  // Generous backstops; the tests themselves finish in a few seconds, so hitting
  // either timeout means a genuine hang, not a slow test.
  timeout: 120000,
  expect: { timeout: 15000 },
  // setup launches Foundry, drives the gates, creates+launches the
  // ephemeral world and saves the GM auth state; teardown stops Foundry
  // (releasing LevelDB locks) and deletes the world.
  globalSetup: "../tests/browser/setup.mjs",
  globalTeardown: "../tests/browser/teardown.mjs",
  // In CI (GitLab): a readable list in the job log, a JUnit report for GitLab's
  // pipeline/MR Tests tab (wire it up with `artifacts:reports:junit`), and a JSON
  // report the MR-comment script parses for the failed-test table. Locally: list.
  reporter: process.env.CI
    ? [
        ["list"],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["json", { outputFile: "test-results/results.json" }],
      ]
    : "list",
  use: {
    baseURL: url,
    storageState: STORAGE_STATE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Foundry's UI needs at least 1920x1080 — the device preset defaults to
    // 1280x720, which is too small (it parks the docked sidebar/dialogs awkwardly
    // and can push controls off-canvas). Override the viewport after the device
    // spread so it takes precedence.
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
