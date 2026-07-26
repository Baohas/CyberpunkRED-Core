import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { RUN_STATE_DIR } from "../config/harness-config.mjs";

const BUILD_LOG = ".playwright/build.log";
const run = (command, options) =>
  spawnSync(command, { shell: true, ...options });

const ownsDataDir = !process.env.FOUNDRY_DATA_PATH;
if (ownsDataDir) {
  process.env.FOUNDRY_DATA_PATH = resolve(".playwright", "foundry-data");
}
process.stdout.write(`Foundry data dir: ${process.env.FOUNDRY_DATA_PATH}\n`);

mkdirSync(dirname(BUILD_LOG), { recursive: true });

const build = run("npx gulp build", { encoding: "utf8" });
const buildOutput = `${build.stdout ?? ""}${build.stderr ?? ""}`;
writeFileSync(BUILD_LOG, buildOutput);
if (build.status !== 0) {
  process.stderr.write(buildOutput);
  process.exit(build.status ?? 1);
}

const env = { ...process.env };
delete env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS;

const forwarded = process.argv
  .slice(2)
  .map((arg) => `"${arg.replace(/"/g, '\\"')}"`)
  .join(" ");

const test = run(
  `npx playwright test -c tools/playwright/config/playwright.config.mjs${
    forwarded ? ` ${forwarded}` : ""
  }`,
  { stdio: "inherit", env },
);

if (ownsDataDir) {
  const retry = {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 200,
  };
  rmSync(process.env.FOUNDRY_DATA_PATH, retry);
  rmSync(RUN_STATE_DIR, retry);
}

process.exit(test.status ?? 1);
