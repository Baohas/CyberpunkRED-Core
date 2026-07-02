import {
  test,
  expect,
  createDocumentViaUI,
  expectSheetRendered,
  captureSheet,
  closeDocSheet,
  uniqueName,
} from "../fixtures.mjs";

/*
 * Netrunning-App feature coverage (headless, canvas-free surface):
 *   - generating a NET Architecture's floors from the RAW rolltables,
 *   - installing an architecture onto an Access Point actor, and
 *   - rendering that architecture in the standalone Netrunning App.
 *
 * The canvas-bound half of the feature — Scanner reveal/ping, the range-gated
 * Jack In, in-app interface abilities (which need a jacked-in runner), and
 * Control-node vision — cannot run under the WebGL-less test session and is
 * validated live via the Playwright MCP instead (see STYLE_GUIDE coverage
 * policy). These specs cover everything reachable without the board.
 */

// A deterministic four-floor architecture used to drive install/render without
// relying on the random generator (which Test 1 covers on its own).
const SEED_FLOORS = [
  { content: "password", dv: 6, depth: 1, branch: null },
  { content: "file", dv: 6, depth: 2, branch: null },
  { content: "controlNode", dv: 8, depth: 3, branch: null },
  { content: "blackIce", dv: null, depth: 4, branch: null, iceName: "Hellhound" },
];

test.describe("Netrunning App", () => {
  test("generates a NET Architecture's floors from the rolltables", async ({
    game,
  }) => {
    const name = uniqueName("netarch");
    const id = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "netarch",
      name,
    });
    const sheetId = await expectSheetRendered(game, { collection: "items", id });

    // The generator lives on the item sheet's Settings tab.
    await game.locator(`#${sheetId} nav [data-tab="settings"]`).click();
    const generate = game.locator(`#${sheetId} .netarch-generate-button`);
    await expect(generate).toBeVisible();
    await generate.click();

    // RAW: 3d6 floors, so at least 3, and the first two are Lobby floors.
    await game.waitForFunction(
      (itemId) => game.items.get(itemId).system.floors.length >= 3,
      id,
      { timeout: 10000 },
    );
    const floors = await game.evaluate(
      (itemId) => game.items.get(itemId).system.floors,
      id,
    );
    expect(floors.length).toBeGreaterThanOrEqual(3);
    const contents = new Set([
      "password",
      "file",
      "controlNode",
      "program",
      "blackIce",
      "demon",
      "root",
    ]);
    for (const floor of floors) {
      expect(contents.has(floor.content)).toBe(true);
      expect(Number.isInteger(floor.depth)).toBe(true);
    }

    await captureSheet(game, sheetId, "netarch-generated");
    await closeDocSheet(game, { collection: "items", id });
  });

  test("installs an architecture on an Access Point and renders the Netrunning App", async ({
    game,
  }) => {
    // A NET Architecture Item with a known floor layout.
    const archName = uniqueName("netarch");
    const archId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "netarch",
      name: archName,
    });
    await closeDocSheet(game, { collection: "items", id: archId });
    const archUuid = await game.evaluate(
      ({ archId, floors }) => {
        const item = game.items.get(archId);
        return item.update({ "system.floors": floors }).then(() => item.uuid);
      },
      { archId, floors: SEED_FLOORS },
    );

    // A blank Access Point actor; its sheet opens on creation.
    const apName = uniqueName("accessPoint");
    const apId = await createDocumentViaUI(game, {
      documentTab: "actors",
      type: "accessPoint",
      name: apName,
    });
    const apSheetId = await expectSheetRendered(game, {
      collection: "actors",
      id: apId,
    });

    // Empty state before installing anything.
    await expect(game.locator(`#${apSheetId} .ap-empty`)).toBeVisible();

    // Install the architecture via the sheet's dropdown (drives #onSelectNetarch).
    await game
      .locator(`#${apSheetId} .ap-netarch-select`)
      .selectOption(archUuid);

    await game.waitForFunction(
      (id) => (game.actors.get(id).getFloors() ?? []).length > 0,
      apId,
      { timeout: 10000 },
    );

    // The installed architecture is an embedded snapshot with our floors.
    const installed = await game.evaluate((id) => {
      const ap = game.actors.get(id);
      return {
        name: ap.installedNetarch?.name ?? null,
        floorCount: ap.getFloors().length,
      };
    }, apId);
    expect(installed.name).toBe(archName);
    expect(installed.floorCount).toBe(SEED_FLOORS.length);

    // The AP sheet lists a row per floor and offers Open / Remove.
    await expect(game.locator(`#${apSheetId} .ap-floor`)).toHaveCount(
      SEED_FLOORS.length,
    );
    await expect(
      game.locator(`#${apSheetId} [data-action="openApp"]`),
    ).toBeVisible();

    // Open the standalone Netrunning App and confirm the phosphor tower renders.
    await game.locator(`#${apSheetId} [data-action="openApp"]`).click();
    const appId = `netrunning-app-${apId}`;
    await game.waitForFunction(
      (id) => foundry.applications.instances.get(id)?.rendered === true,
      appId,
      { timeout: 10000 },
    );

    const appElId = await game.evaluate((id) => {
      const app = foundry.applications.instances.get(id);
      return (app.element?.[0] ?? app.element)?.id ?? null;
    }, appId);
    expect(appElId).toBeTruthy();

    // One floor card per floor, and — with no runner jacked in — the empty
    // runner-panel state.
    await expect(
      game.locator(`#${appElId} .cpr-net-floors .cpr-net-floor`),
    ).toHaveCount(SEED_FLOORS.length);
    await expect(game.locator(`#${appElId} .cpr-net-todo`)).toBeVisible();

    await captureSheet(game, appElId, "netrunning-app");

    // Removing the architecture returns the AP sheet to its empty state.
    await game.locator(`#${apSheetId} [data-action="uninstall"]`).click();
    await expect(game.locator(`#${apSheetId} .ap-empty`)).toBeVisible();

    await game.evaluate((id) => {
      foundry.applications.instances.get(id)?.close();
    }, appId);
    await closeDocSheet(game, { collection: "actors", id: apId });
  });
});
