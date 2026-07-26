import { chromium } from "@playwright/test";
import {
  clearRunState,
  newWorldId,
  removeWorld,
  resolveHarnessConfig,
  writeSession,
} from "../config/harness-config.mjs";
import { startFoundry, stopFoundry } from "../server/foundry-server.mjs";
import { driveSetup, joinAsGM } from "../setup/foundry-setup.mjs";

function createSession({
  config,
  child,
  worldId,
  mode,
  ephemeral,
  browser,
  page,
}) {
  const session = {
    config,
    worldId,
    mode,
    metadata: {
      worldId,
      dataPath: config.dataPath,
      pid: child.pid,
      port: config.port,
      mode,
      dataPathMode: config.dataPathMode,
    },
    pid: child.pid,
    ephemeral,
    browser,
    page,
    async stop() {
      await page?.close().catch(() => {});
      await browser?.close().catch(() => {});
      await stopFoundry(child);
      if (ephemeral) await removeWorld(config.dataPath, worldId);
      clearRunState();
    },
  };
  writeSession(session);
  return session;
}

async function launchWorld({
  mode,
  dataPathMode,
  silent = false,
  keepBrowser = false,
} = {}) {
  const config = resolveHarnessConfig({ mode, dataPathMode });
  const worldId = newWorldId();
  const { child } = await startFoundry({ config, mode, silent });
  let browser;
  let page;
  let session;
  try {
    browser = await chromium.launch(
      mode === "test" ? { args: ["--no-sandbox"] } : undefined,
    );
    page = await browser.newPage(
      mode === "test" ? { viewport: { width: 1920, height: 1080 } } : undefined,
    );
    await driveSetup(page, { config, worldId });
    await joinAsGM(page, config);
    session = createSession({
      config,
      child,
      worldId,
      mode,
      ephemeral: true,
      browser: keepBrowser ? browser : undefined,
      page: keepBrowser ? page : undefined,
    });
    if (!keepBrowser) {
      await browser.close();
      browser = undefined;
      page = undefined;
    }
    return session;
  } catch (error) {
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await stopFoundry(child).catch(() => {});
    clearRunState();
    await removeWorld(config.dataPath, worldId).catch(() => {});
    throw error;
  }
}

export function launchLiveWorld(options = {}) {
  return launchWorld({ ...options, mode: "live", dataPathMode: "configured" });
}

export async function buildAndLaunchLiveWorld(options = {}) {
  const { spawnSync } = await import("node:child_process");
  const build = spawnSync("npx gulp build", { shell: true, encoding: "utf8" });
  if (build.status !== 0) {
    process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
    process.exit(build.status ?? 1);
  }
  return launchLiveWorld(options);
}

export function launchTestWorld(options = {}) {
  return launchWorld({ ...options, mode: "test", dataPathMode: "isolated" });
}

export async function buildAndLaunchTestWorld(options = {}) {
  const { spawnSync } = await import("node:child_process");
  const build = spawnSync("npx gulp build", { shell: true, encoding: "utf8" });
  if (build.status !== 0) {
    process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
    process.exit(build.status ?? 1);
  }
  return launchTestWorld(options);
}
