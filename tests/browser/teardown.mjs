import fs from "fs-extra";
import { stopServer } from "../../tools/foundry-server/server.mjs";
import {
  resolveConfig,
  readWorldId,
  clearWorldId,
  worldDir,
} from "../../tools/foundry-server/config.mjs";

/*
 * Runs once after the suite. Stops Foundry FIRST (a clean, awaited shutdown that
 * releases the exclusive LevelDB locks), THEN deletes the ephemeral world — the
 * order matters because the world's databases are locked while the server runs.
 */
export default async function globalTeardown() {
  await stopServer();

  const worldId = readWorldId();
  if (worldId) {
    const { dataPath } = resolveConfig();
    await fs.remove(worldDir(dataPath, worldId));
    clearWorldId();
  }
}
