import fs from "fs-extra";
import { rm } from "node:fs/promises";
import path from "path";
import crypto from "crypto";

export const SYSTEM_NAME = process.env.SYSTEM_NAME || "cyberpunk-red-core";
export const DEFAULT_VERSION_PREFIX = "v";
export const RUN_STATE_DIR = path.resolve(".playwright", "run-state");
export const SESSION_STATE = path.join(RUN_STATE_DIR, "session.json");
export const STORAGE_STATE = path.join(RUN_STATE_DIR, "gm.json");
export const PLAYER_STORAGE_STATE = path.join(RUN_STATE_DIR, "player.json");
export const PLAYER_NAME = "E2E Player";
export const PLAYER_CHARACTER_NAME = "E2E Shopper";

const EPHEMERAL_PREFIX = "cprc-playwright-";

function readLocalConfig() {
  const localConfigPath = path.resolve("foundryconfig.json");
  return fs.existsSync(localConfigPath) ? fs.readJSONSync(localConfigPath) : {};
}

export function foundryVersion() {
  if (process.env.FOUNDRY_VERSION) return String(process.env.FOUNDRY_VERSION);
  const system = fs.readJSONSync(path.resolve("src", "system.json"));
  const verified = system?.compatibility?.verified;
  if (verified === undefined || verified === null) {
    throw new Error(
      "Could not determine the Foundry version: src/system.json has no " +
        "compatibility.verified. Set FOUNDRY_VERSION to override.",
    );
  }
  return String(verified);
}

export function expandVersion(rawPath, { version, versionPrefix } = {}) {
  if (typeof rawPath !== "string" || !rawPath.includes("{VERSION}")) {
    return rawPath;
  }
  const prefix = versionPrefix ?? DEFAULT_VERSION_PREFIX;
  const resolved = version ?? foundryVersion();
  return rawPath.replaceAll("{VERSION}", `${prefix}${resolved}`);
}

export function newWorldId() {
  return `${EPHEMERAL_PREFIX}${crypto.randomBytes(4).toString("hex")}`;
}

export function resolveHarnessConfig({
  mode = "test",
  dataPathMode,
  honorEnvDataPath = true,
} = {}) {
  const local = readLocalConfig();
  const versionPrefix = local.foundry?.versionPrefix;
  const rawAppPath = process.env.FOUNDRY_APP_PATH || local.foundry?.appPath;
  const explicitDataPath = honorEnvDataPath
    ? process.env.FOUNDRY_DATA_PATH
    : undefined;
  const selectedDataPathMode =
    dataPathMode ?? (mode === "live" ? "configured" : "isolated");
  const rawDataPath =
    explicitDataPath ||
    (selectedDataPathMode === "isolated"
      ? path.resolve(".playwright", "foundry-data")
      : local.foundry?.dataPath);
  const licenseKey =
    process.env.FOUNDRY_LICENSE_KEY || local.foundry?.licenseKey || "";
  const port = Number(process.env.PLAYWRIGHT_FOUNDRY_PORT || 30001);

  if (!rawAppPath) {
    throw new Error(
      "Foundry application path is not set. Add 'foundry.appPath' to " +
        "foundryconfig.json or set FOUNDRY_APP_PATH.",
    );
  }
  if (!rawDataPath) {
    throw new Error(
      "Foundry data path is not set. Add 'foundry.dataPath' to foundryconfig.json " +
        "or set FOUNDRY_DATA_PATH.",
    );
  }

  const version = foundryVersion();
  const appPath = expandVersion(rawAppPath, { version, versionPrefix });
  const dataPath = expandVersion(rawDataPath, { version, versionPrefix });
  const appDir = rawAppPath.includes("{VERSION}")
    ? appPath
    : path.join(
        appPath,
        `${versionPrefix ?? DEFAULT_VERSION_PREFIX}${version}`,
      );

  return {
    appPath,
    version,
    appDir,
    dataPath,
    dataPathMode: explicitDataPath ? "override" : selectedDataPathMode,
    licenseKey,
    mode,
    port,
    runStateDir: RUN_STATE_DIR,
    sessionState: SESSION_STATE,
    storageState: STORAGE_STATE,
    playerStorageState: PLAYER_STORAGE_STATE,
    url: `http://localhost:${port}`,
  };
}

export function resolveMainJs(appDir) {
  const candidates = [
    path.join(appDir, "resources", "app", "main.js"),
    path.join(appDir, "main.js"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      `Could not find Foundry main.js under '${appDir}'. Looked at:\n  ` +
        candidates.join("\n  ") +
        `\n(appPath may use a {VERSION} placeholder; if it omits one, the ` +
        `<versionPrefix><version> subdir from src/system.json is appended — ` +
        `set FOUNDRY_VERSION to target a different version.)`,
    );
  }
  return found;
}

export function worldDir(dataPath, worldId) {
  return path.join(dataPath, "Data", "worlds", worldId);
}

export async function removeWorld(dataPath, worldId) {
  await rm(worldDir(dataPath, worldId), {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 200,
  });
}

export function writeSession(session) {
  fs.ensureDirSync(RUN_STATE_DIR);
  fs.writeJSONSync(
    SESSION_STATE,
    {
      worldId: session.worldId,
      dataPath: session.config.dataPath,
      pid: session.pid,
      port: session.config.port,
      mode: session.mode,
      dataPathMode: session.config.dataPathMode,
      ephemeral: session.ephemeral,
    },
    { spaces: 2 },
  );
}

export function readSession() {
  return fs.existsSync(SESSION_STATE) ? fs.readJSONSync(SESSION_STATE) : null;
}

export function clearRunState() {
  fs.removeSync(RUN_STATE_DIR);
}
