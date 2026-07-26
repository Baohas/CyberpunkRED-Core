import { buildAndLaunchLiveWorld } from "../flows/foundry-flows.mjs";

const session = await buildAndLaunchLiveWorld();

console.log(
  `\nFoundry is up at ${session.config.url} (world: ${session.worldId}).`,
);
console.log(
  "Drive it live (e.g. via the Playwright MCP). Press Ctrl-C to stop.\n",
);

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await session.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
