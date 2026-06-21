import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/*
 * Cross-platform runner for `npm run test:browser`.
 *
 * This was a one-line shell pipeline (env/cat/subshells/redirects) that only
 * works on a POSIX shell — on Windows npm runs scripts through cmd.exe, which
 * has none of those, so the script failed with "'env' is not recognized". Node
 * runs the same steps identically on every platform:
 *
 *   1. Build the system, capturing output to .playwright/build.log and only
 *      surfacing it if the build fails (a passing run stays quiet).
 *   2. Run Playwright with PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS removed.
 *      The Nix dev shell sets it (shell.nix); unsetting it for the run drops
 *      Playwright's "skipping host requirements" notice. Off Nix it is not set,
 *      so deleting it is a no-op.
 */

const BUILD_LOG = ".playwright/build.log";

// shell:true so the package-manager shims resolve (e.g. npx -> npx.cmd on
// Windows); harmless on POSIX. The commands contain no shell metacharacters.
const run = (command, options) =>
  spawnSync(command, { shell: true, ...options });

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

const test = run("npx playwright test -c .playwright/playwright.config.mjs", {
  stdio: "inherit",
  env,
});
process.exit(test.status ?? 1);
