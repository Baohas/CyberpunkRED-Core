import fs from "fs-extra";
import { chromium } from "@playwright/test";
import { startServer, stopServer } from "./server.mjs";
import { driveSetup } from "./setup.mjs";
import { newWorldId, readWorldId, clearWorldId, worldDir } from "./config.mjs";

/*
 * `npm run browser:serve` — brings Foundry up with a fresh ephemeral world launched
 * and ready, then stays in the foreground so it can be driven live (e.g. via the
 * Playwright MCP at the printed URL). Ctrl-C stops Foundry cleanly and removes
 * the ephemeral world, mirroring teardown.
 */
const { child, config } = await startServer();
const worldId = newWorldId();

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await driveSetup(page, { config, worldId });
} finally {
  await browser.close();
}

/* eslint-disable no-console */
console.log(`\nFoundry is up at ${config.url} (world: ${worldId}).`);
console.log("Drive it live (e.g. via the Playwright MCP). Press Ctrl-C to stop.\n");
/* eslint-enable no-console */

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await stopServer(child);
  const id = readWorldId();
  if (id) {
    await fs.remove(worldDir(config.dataPath, id));
    clearWorldId();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
