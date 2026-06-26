import { SYSTEM_NAME } from "./config.mjs";

/*
 * Drives Foundry's startup gates and gets us into a launched, ready world.
 *
 * IMPORTANT: the exact selectors for the license / EULA / setup screens are
 * Foundry-version-specific (v13 moved everything to ApplicationV2). They are
 * written defensively here but SHOULD be confirmed against a live instance on
 * first run — `npm run browser:serve` + the Playwright MCP is the intended way to
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
 * as a `.tour-overlay` + `.tour` that render above the setup UI and intercept
 * clicks on the controls below — enough to make worldCreate/worldLaunch silently
 * time out ("<div class="tour-overlay"></div> intercepts pointer events"). The
 * exit control varies by tour/version and the overlay doesn't reliably respond to
 * Escape, so just strip the tour DOM directly — that's the only thing that
 * guarantees the controls underneath become clickable. Idempotent; no-op when
 * none is present.
 */
async function dismissTours(page) {
  await page
    .evaluate(() => {
      for (const sel of [".tour-overlay", ".tour", ".tour-center-step"]) {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      }
    })
    .catch(() => {});
}

/*
 * Click a Setup control even when a tour overlay is fighting us: a tour can
 * re-render between page load and the click and intercept pointer events, which
 * makes a normal `.click()` time out ("<div class="tour-overlay"> intercepts
 * pointer events"). Clear the tour first, try a real click, and fall back to
 * dispatching the event straight at the element — which ignores any overlay
 * stacked on top. Mirrors the worldLaunch handling below.
 */
async function clickThrough(page, locator) {
  await dismissTours(page);
  await locator
    .click({ timeout: SHORT })
    .catch(() => locator.dispatchEvent("click"));
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
  await page.locator("button#sign").first().click();
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function createAndLaunchWorld(page, worldId, config) {
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
    await clickThrough(page, createButton);

    // World creation dialog.
    await page.locator('input[name="title"]').first().fill(worldId);
    const idInput = page.locator('input[name="id"]').first();
    if (await present(idInput, 1000)) {
      await idInput.fill(worldId);
    }
    await page
      .locator('select[name="system"]')
      .first()
      .selectOption(SYSTEM_NAME);
    await clickThrough(
      page,
      page
        .locator('button[type="submit"], button:has-text("Create World")')
        .last(),
    );
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  // Launch the world and confirm it actually went active. In v13 the launch
  // click is easy to lose — the control is hover-revealed on the world tile and a
  // tour overlay can sit over it — which silently leaves us on /setup so that
  // /join reports "no active game session". Retry from /setup until the world is
  // up (the join screen renders the user picker only once a world is launched).
  for (let attempt = 0; attempt < 6; attempt += 1) {
    // A fresh world can trigger another tour (e.g. "Backups Overview") that sits
    // over the launch control — clear it before launching.
    // eslint-disable-next-line no-await-in-loop
    await dismissTours(page);

    // The launch control is revealed on hover over the world tile, so hover the
    // tile first; if it still isn't actionable, dispatch the click directly (the
    // anchor is in the DOM regardless of the hover-reveal styling).
    const tile = page.locator(`[data-package-id="${worldId}"]`).first();
    // eslint-disable-next-line no-await-in-loop
    if (await present(tile)) {
      // eslint-disable-next-line no-await-in-loop
      await tile.hover().catch(() => {});
      const launch = tile.locator('[data-action="worldLaunch"]').first();
      // eslint-disable-next-line no-await-in-loop
      if (await present(launch, 1500)) await launch.click().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      else await launch.dispatchEvent("click").catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await page.waitForLoadState("networkidle").catch(() => {});
    }

    // Verify the world is live: the user picker on /join only renders when a
    // world is active. If it's there, we're done.
    // eslint-disable-next-line no-await-in-loop
    await page.goto(`${config.url}/join`, { waitUntil: "domcontentloaded" });
    // eslint-disable-next-line no-await-in-loop
    if (await present(page.locator('select[name="userid"]').first(), 2000)) {
      return;
    }

    // Still showing "no active game session" — go back to /setup and retry.
    // eslint-disable-next-line no-await-in-loop
    await page.goto(`${config.url}/setup`, { waitUntil: "domcontentloaded" });
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
  await createAndLaunchWorld(page, worldId, config);
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

  // A freshly launched world starts paused, which blocks many in-game
  // interactions (and silently makes driven actions miss). Unpause as GM with
  // `broadcast: true` so the server records the change — pause is shared,
  // server-side session state, so it then persists for any later client that
  // joins the same running world. Settle briefly afterwards to let the socket
  // emit flush before a caller (e.g. serve.mjs) closes the page.
  await page
    .evaluate(
      () =>
        globalThis.game?.paused &&
        globalThis.game.togglePause(false, { broadcast: true }),
    )
    .catch(() => {});
  await page.waitForTimeout(750);
}
