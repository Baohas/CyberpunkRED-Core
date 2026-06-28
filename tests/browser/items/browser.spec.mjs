import {
  test,
  expect,
  openSidebarTab,
  createDocumentViaUI,
  closeDocSheet,
  expectSheetRendered,
  uniqueName,
} from "../fixtures.mjs";

/*
 * UI-driven tests for the document browser (CPRDocumentBrowser) as the GM — the
 * browse-and-filter half of the feature. Each test runs against a fresh, reset
 * world (the `game` fixture, which authenticates as the GM) and drives the
 * browser the way a user would: launching it from the Item directory, typing in
 * the search, toggling a type box, and collapsing a result group. Assertions
 * read game/DOM state but never perform the action under test.
 *
 * The player-facing shop/cart half lives in browser-shop.spec.mjs (it needs a
 * non-GM user with an assigned Character, which this GM-only harness lacks).
 *
 * World items are created with unique names so a name search isolates them from
 * the (many) compendium entries the browser also indexes, keeping the result
 * counts deterministic.
 */

// Launch the browser in Item mode from the Item directory's footer button and
// wait for its results to start rendering. Returns the browser window locator.
async function openItemBrowser(page) {
  await openSidebarTab(page, "items");
  const launch = page.locator('#items .cpr-browser-launch[data-mode="item"]');
  await expect(launch).toBeVisible();
  await launch.click();

  const browser = page.locator("#cpr-document-browser");
  await expect(browser).toBeVisible();
  await expect(browser.locator(".cpr-browser-results-list")).toBeVisible();
  // The first batch (or the empty-state) has rendered, so listeners are wired.
  await expect(
    browser.locator(".cpr-browser-entry, .cpr-browser-empty").first(),
  ).toBeVisible();
  return browser;
}

test.describe("Document browser", () => {
  test("launches from the Item directory and renders its filter UI", async ({
    game,
  }) => {
    const browser = await openItemBrowser(game);
    await expect(browser.locator(".cpr-browser-name-input")).toBeVisible();
    // The top-bar global filters and a per-type filter box are present.
    await expect(browser.locator(".cpr-browser-global-filters")).toBeVisible();
    await expect(
      browser.locator('.cpr-browser-typebox[data-type="weapon"]'),
    ).toBeVisible();
  });

  test("name search narrows to a matching item and opens it on click", async ({
    game,
  }) => {
    const name = uniqueName("gear");
    const itemId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "gear",
      name,
    });
    await closeDocSheet(game, { collection: "items", id: itemId });

    const browser = await openItemBrowser(game);
    await browser.locator(".cpr-browser-name-input").fill(name);

    const entries = browser.locator(".cpr-browser-entry");
    await expect(entries).toHaveCount(1);
    await expect(entries.first().locator(".cpr-browser-entry-name")).toHaveText(
      name,
    );

    // Clicking the row's open zone resolves and renders the item's sheet.
    await entries.first().locator(".cpr-browser-entry-open").click();
    await expectSheetRendered(game, { collection: "items", id: itemId });
  });

  test("a type box set to 'only' scopes results to that type", async ({
    game,
  }) => {
    const token = uniqueName("scope");
    const weaponId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "weapon",
      name: `${token} blade`,
    });
    await closeDocSheet(game, { collection: "items", id: weaponId });
    const gearId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "gear",
      name: `${token} crate`,
    });
    await closeDocSheet(game, { collection: "items", id: gearId });

    const browser = await openItemBrowser(game);
    await browser.locator(".cpr-browser-name-input").fill(token);
    await expect(browser.locator(".cpr-browser-entry")).toHaveCount(2);

    // Cycle the Weapon box's tri-state include -> exclude -> only.
    const weaponTristate = browser.locator(
      '.cpr-browser-typebox[data-type="weapon"] .cpr-browser-tristate[data-tree="type"]',
    );
    await weaponTristate.click();
    await weaponTristate.click();
    await expect(weaponTristate).toHaveAttribute("data-state", "only");

    const entries = browser.locator(".cpr-browser-entry");
    await expect(entries).toHaveCount(1);
    await expect(entries.first().locator(".cpr-browser-entry-name")).toHaveText(
      `${token} blade`,
    );
  });

  test("the price filter excludes items above the max", async ({ game }) => {
    const token = uniqueName("price");
    const cheapId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "gear",
      name: `${token} cheap`,
    });
    await closeDocSheet(game, { collection: "items", id: cheapId });
    const dearId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "gear",
      name: `${token} dear`,
    });
    await closeDocSheet(game, { collection: "items", id: dearId });

    // Distinct prices (setup, not the action under test).
    await game.evaluate(
      async ({ cheapId, dearId }) => {
        await game.items.get(cheapId).update({ "system.price.market": 50 });
        await game.items.get(dearId).update({ "system.price.market": 500 });
      },
      { cheapId, dearId },
    );

    const browser = await openItemBrowser(game);
    await browser.locator(".cpr-browser-name-input").fill(token);
    await expect(browser.locator(".cpr-browser-entry")).toHaveCount(2);

    const maxInput = browser.locator(".cpr-browser-price-max");
    await maxInput.fill("100");
    await maxInput.blur();

    const entries = browser.locator(".cpr-browser-entry");
    await expect(entries).toHaveCount(1);
    await expect(entries.first().locator(".cpr-browser-entry-name")).toHaveText(
      `${token} cheap`,
    );
  });

  test("a type box tri-state is keyboard operable (focus + Enter cycles it)", async ({
    game,
  }) => {
    const token = uniqueName("keys");
    const weaponId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "weapon",
      name: `${token} blade`,
    });
    await closeDocSheet(game, { collection: "items", id: weaponId });
    const gearId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "gear",
      name: `${token} crate`,
    });
    await closeDocSheet(game, { collection: "items", id: gearId });

    const browser = await openItemBrowser(game);
    await browser.locator(".cpr-browser-name-input").fill(token);
    await expect(browser.locator(".cpr-browser-entry")).toHaveCount(2);

    const weaponTristate = browser.locator(
      '.cpr-browser-typebox[data-type="weapon"] .cpr-browser-tristate[data-tree="type"]',
    );
    // The toggle is reachable by keyboard...
    await expect(weaponTristate).toHaveAttribute("tabindex", "0");
    // ...and Enter cycles it the same way a click does (include -> exclude -> only).
    await weaponTristate.focus();
    await weaponTristate.press("Enter");
    await weaponTristate.press("Enter");
    await expect(weaponTristate).toHaveAttribute("data-state", "only");

    const entries = browser.locator(".cpr-browser-entry");
    await expect(entries).toHaveCount(1);
    await expect(entries.first().locator(".cpr-browser-entry-name")).toHaveText(
      `${token} blade`,
    );
  });

  test("a result row opens its sheet via the keyboard", async ({ game }) => {
    const name = uniqueName("kbopen");
    const itemId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "gear",
      name,
    });
    await closeDocSheet(game, { collection: "items", id: itemId });

    const browser = await openItemBrowser(game);
    await browser.locator(".cpr-browser-name-input").fill(name);
    const open = browser.locator(".cpr-browser-entry .cpr-browser-entry-open");
    await expect(open).toHaveCount(1);

    // The row-open control is focusable and activates on Enter (no mouse).
    await expect(open).toHaveAttribute("tabindex", "0");
    await open.focus();
    await open.press("Enter");
    await expectSheetRendered(game, { collection: "items", id: itemId });
  });

  test("rows are draggable for the GM and carry an item drag payload", async ({
    game,
  }) => {
    const name = uniqueName("gmdrag");
    const itemId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "gear",
      name,
    });
    await closeDocSheet(game, { collection: "items", id: itemId });

    const browser = await openItemBrowser(game);
    await browser.locator(".cpr-browser-name-input").fill(name);
    const row = browser.locator(".cpr-browser-entry[data-uuid]");
    await expect(row).toHaveCount(1);

    // GM rows are draggable and starting a drag writes the Foundry drop payload.
    await expect(row).toHaveAttribute("draggable", "true");
    const payload = await game.evaluate(() => {
      const el = document.querySelector(
        "#cpr-document-browser .cpr-browser-entry[data-uuid]",
      );
      const dt = new DataTransfer();
      el.dispatchEvent(
        new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        }),
      );
      return dt.getData("text/plain");
    });
    expect(JSON.parse(payload)).toMatchObject({ type: "Item" });
  });

  test("collapsing a result group hides its rows", async ({ game }) => {
    const name = uniqueName("collapse");
    const itemId = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "weapon",
      name,
    });
    await closeDocSheet(game, { collection: "items", id: itemId });

    const browser = await openItemBrowser(game);
    await browser.locator(".cpr-browser-name-input").fill(name);

    const entry = browser.locator(".cpr-browser-entry");
    await expect(entry).toHaveCount(1);
    await expect(entry.first()).toBeVisible();

    const header = browser.locator(
      '.cpr-browser-group-header[data-group="weapon"]',
    );
    await header.click();
    await expect(entry.first()).toBeHidden();

    await header.click();
    await expect(entry.first()).toBeVisible();
  });
});
