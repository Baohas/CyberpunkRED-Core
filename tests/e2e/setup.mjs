import { chromium } from "@playwright/test";
import { startServer } from "../../tools/foundry-server/server.mjs";
import { driveSetup, joinAsGM } from "../../tools/foundry-server/setup.mjs";
import { newWorldId, STORAGE_STATE } from "../../tools/foundry-server/config.mjs";

/*
 * Runs once before the suite. Starts Foundry, drives whatever startup gates are
 * pending, creates + launches a fresh ephemeral world, signs in as the GM, and
 * saves the authenticated storage state for the specs to reuse. The Foundry
 * process is left running (tracked by pid file) and stopped in teardown.
 */
export default async function globalSetup() {
  const { config } = await startServer();
  const worldId = newWorldId();

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await driveSetup(page, { config, worldId });
    await joinAsGM(page, config);
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
