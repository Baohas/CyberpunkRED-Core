import { chromium } from "@playwright/test";
import { startServer } from "../../tools/foundry-server/server.mjs";
import { driveSetup, joinAsGM } from "../../tools/foundry-server/setup.mjs";
import {
  newWorldId,
  STORAGE_STATE,
} from "../../tools/foundry-server/config.mjs";

/*
 * Runs once before the suite. Starts Foundry, drives whatever startup gates are
 * pending, creates + launches a fresh ephemeral world, signs in as the GM, and
 * saves the authenticated storage state for the specs to reuse. The Foundry
 * process is left running (tracked by pid file) and stopped in teardown.
 */
export default async function globalSetup() {
  const { config } = await startServer({ silent: true });
  const worldId = newWorldId();

  // --no-sandbox so this launch also works on root CI runners (the test
  // browsers get the same via chromiumSandbox:false in the Playwright config).
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await driveSetup(page, { config, worldId });
    await joinAsGM(page, config);
    // Disable Foundry's WebGL canvas for the test session. These specs only
    // touch sheets and the sidebar (never the board), so initialising PIXI/WebGL
    // under software rendering is pure overhead. It is a client setting stored in
    // localStorage, so saving it into the storage state below makes every spec's
    // browser context inherit it.
    await page.evaluate(() => game.settings.set("core", "noCanvas", true));
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
