import { SYSTEM_NAME } from "./config.mjs";

/*
 * Drives Foundry's startup gates and gets us into a launched, ready world.
 *
 * IMPORTANT: the exact selectors for the license / EULA / setup screens are
 * Foundry-version-specific (v13 moved everything to ApplicationV2). They are
 * written defensively here but SHOULD be confirmed against a live instance on
 * first run — `npm run e2e:serve` + the Playwright MCP is the intended way to
 * inspect the real DOM and adjust these. Each step is a no-op if its screen is
 * not present, so a warm dataPath (already licensed, EULA accepted) skips ahead.
 */

const SHORT = 4000;

// True if `locator` becomes visible within `timeout`, false otherwise — never throws.
async function present(locator, timeout = SHORT) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

/*
 * Foundry shows onboarding "tours" (e.g. the Setup screen's "Backups Overview")
 * as a `.tour` overlay that renders above the setup UI and intercepts clicks on
 * the controls below it — enough to make worldCreate/worldLaunch silently miss.
 * Dismiss any visible tour by clicking its exit ("X") control. A tour can chain
 * several steps, so exit a few times. No-op when none is present.
 */
async function dismissTours(page) {
  const exit = page.locator(
    '.tour-center-step a[data-action="exit"], .tour a[data-action="exit"]',
  );
  for (let i = 0; i < 5; i += 1) {
    if (!(await present(exit, 1000))) break;
    await exit.first().click().catch(() => {});
  }
}

/*
 * On a fresh data dir, Foundry's Setup screen opens a "Share Usage Data" consent
 * prompt that sits above the world/tour controls until answered. Decline it so
 * the setup UI is interactable. No-op on a data dir that already answered.
 */
async function declineDataSharing(page) {
  const decline = page
    .locator(
      'button[data-action="no"]:has-text("Decline Sharing"), ' +
        'button:has-text("Decline Sharing")',
    )
    .first();
  if (await present(decline)) {
    await decline.click().catch(() => {});
  }
}

async function acceptLicense(page, licenseKey) {
  const keyInput = page.locator('input[name="licenseKey"]').first();
  if (!(await present(keyInput))) return;

  if (!licenseKey) {
    throw new Error(
      "Foundry is showing the license activation screen but no license key is " +
        "configured. Set 'licenseKey' in foundryconfig.json or FOUNDRY_LICENSE_KEY.",
    );
  }
  await keyInput.fill(licenseKey);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function acceptEula(page) {
  const agree = page
    .locator('input#eula-agree, input[name="agree"], input[type="checkbox"]')
    .first();
  if (!(await present(agree))) return;

  await agree.check().catch(() => {});
  await page.locator('button#sign').first().click();
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function createAndLaunchWorld(page, worldId) {
  // Already in a world / at the join screen — nothing to set up.
  if (/\/(game|join)/.test(new URL(page.url()).pathname)) return;

  // The Setup screen often opens a tour overlay that would intercept our clicks.
  await dismissTours(page);

  const createButton = page
    .locator(
      '[data-action="worldCreate"], button:has-text("Create World"), a:has-text("Create World")',
    )
    .first();
  if (await present(createButton)) {
    await createButton.click();

    // World creation dialog.
    await page.locator('input[name="title"]').first().fill(worldId);
    const idInput = page.locator('input[name="id"]').first();
    if (await present(idInput, 1000)) {
      await idInput.fill(worldId);
    }
    await page.locator('select[name="system"]').first().selectOption(SYSTEM_NAME);
    await page
      .locator('button[type="submit"], button:has-text("Create World")')
      .last()
      .click();
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  // A fresh world can trigger another tour (e.g. "Backups Overview") that sits
  // over the launch control — clear it before launching.
  await dismissTours(page);

  // Launch the world we just created (or that already existed).
  const launch = page
    .locator(`[data-package-id="${worldId}"] [data-action="worldLaunch"]`)
    .first();
  if (await present(launch)) {
    await launch.click();
  }
}

/*
 * Idempotently satisfy whatever gate Foundry is currently showing, then ensure
 * our ephemeral world is created and launched. On a fresh data dir the order is
 * license -> EULA -> decline data-sharing -> setup.
 */
export async function driveSetup(page, { config, worldId }) {
  await page.goto(config.url, { waitUntil: "domcontentloaded" });

  await acceptLicense(page, config.licenseKey);
  await acceptEula(page);
  await declineDataSharing(page);
  await createAndLaunchWorld(page, worldId);
}

/*
 * From the world login screen, sign in as the default Gamemaster (blank password
 * on a freshly created world) and wait for the game to be ready.
 */
export async function joinAsGM(page, config) {
  if (!/\/(join|auth)/.test(new URL(page.url()).pathname)) {
    await page.goto(`${config.url}/join`, { waitUntil: "domcontentloaded" });
  }

  const userSelect = page.locator('select[name="userid"]').first();
  if (await present(userSelect)) {
    await userSelect.selectOption({ label: "Gamemaster" }).catch(async () => {
      // Fall back to the first non-placeholder option if the label differs.
      await userSelect.selectOption({ index: 1 });
    });
  }
  await page.locator('input[name="password"]').first().fill("");
  await page
    .locator('button[name="join"], button[type="submit"]')
    .first()
    .click();

  await page.waitForFunction(() => globalThis.game?.ready === true, null, {
    timeout: 60000,
  });
}
