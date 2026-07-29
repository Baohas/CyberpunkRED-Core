import { test, expect } from "@playwright/test";
import { gotoReadyWorld } from "../../../tools/playwright/session/world.mjs";
import {
  createItemViaUI,
  openSidebarTab,
  uniqueName,
} from "../../../tools/playwright/ui/index.mjs";

/*
 * UI-driven tests for the document browser's source handling — the citation line
 * shown on each result row and the "Source Book" tristate filter's any-match
 * semantics. Items now carry `system.sources` (an array of {book,page}); a row's
 * citation shows only the FIRST source inline with any remaining sources in a
 * hover tooltip, while the book filter treats an item as belonging to a book if
 * ANY of its sources cites it (not just the first).
 *
 * Each test explicitly navigates to the ready world as the GM and drives the
 * document browser the way a user would. Items are created with unique names
 * and known `sources` arrays so a name search isolates them from the (many)
 * compendium entries the document browser also indexes, and the assertions only
 * read visible result rows — never the action under test. Cleanup deletes every
 * world item after each test.
 */

// Launch the document browser in Item mode and wait for results to start rendering.
async function openItemBrowser(page) {
  await openSidebarTab(page, "items");
  const launch = page.locator('#items .cpr-browser-launch[data-mode="item"]');
  await expect(launch).toBeVisible();
  await launch.click();

  const documentBrowser = page.locator("#cpr-document-browser");
  await expect(documentBrowser).toBeVisible();
  await expect(
    documentBrowser.locator(".cpr-browser-results-list"),
  ).toBeVisible();
  await expect(
    documentBrowser.locator(".cpr-browser-entry, .cpr-browser-empty").first(),
  ).toBeVisible();
  return documentBrowser;
}

// Create a world gear item with a known name and `sources` array; return its id.
async function createGear(page, name, sources) {
  const id = await createItemViaUI(page, { type: "gear", name });
  await page.evaluate(
    ({ id, sources }) =>
      game.items.get(id).update({ "system.sources": sources }),
    { id, sources },
  );
  return id;
}

// The result row whose name matches exactly one of our unique item names.
function rowByName(page, documentBrowser, name) {
  return documentBrowser.locator(".cpr-browser-entry").filter({
    has: page.locator(".item-header-name", { hasText: name }),
  });
}

// The "Source Book" filter fieldset and one of its book options (located by the
// book's label text so the test does not depend on how the value is encoded).
function bookFilter(documentBrowser) {
  return documentBrowser.locator(
    '.cpr-browser-filter-tristate[data-filter-id="book"]',
  );
}

function bookOption(documentBrowser, book) {
  return bookFilter(documentBrowser)
    .locator(".cpr-browser-tristate-row")
    .filter({ hasText: book })
    .locator(".cpr-browser-tristate");
}

// The book filter fieldset may render collapsed; expand it so its options can be
// clicked. Idempotent — only expands when currently collapsed.
async function expandBookFilter(documentBrowser) {
  const fs = bookFilter(documentBrowser);
  await expect(fs).toBeVisible();
  if (
    await fs.evaluate((el) => el.classList.contains("cpr-browser-collapsed"))
  ) {
    await fs.locator("legend").click();
  }
  await expect(bookOption(documentBrowser, "").first()).toBeVisible();
}

// Click a tristate span until it reports the wanted state. The control cycles
// through its states on repeated clicks, so a bounded loop reaches any of them.
async function cycleTo(locator, target) {
  for (let i = 0; i < 4; i += 1) {
    if ((await locator.getAttribute("data-state")) === target) return;
    await locator.click();
  }
  await expect(locator).toHaveAttribute("data-state", target);
}

test.beforeEach(async ({ page }) => {
  await gotoReadyWorld(page);
});

test.describe("Document browser — sources", () => {
  test("a row's citation shows the first source inline and the rest in a tooltip, and empty sources render blank", async ({
    page: game,
  }) => {
    const token = uniqueName("cite");
    const nameB = `${token} bravo`;
    const nameEmpty = `${token} empty`;
    // bravo cites two books (page > 0); the empty item has no sources at all.
    await createGear(game, nameB, [
      { book: "BBBBook", page: 5 },
      { book: "AAABook", page: 99 },
    ]);
    await createGear(game, nameEmpty, []);

    const documentBrowser = await openItemBrowser(game);
    await documentBrowser.locator(".cpr-browser-name-input").fill(token);
    await expect(documentBrowser.locator(".cpr-browser-entry")).toHaveCount(2);

    // bravo's row shows only its FIRST source inline, as "BOOK pg. PAGE".
    const bravoSource = rowByName(game, documentBrowser, nameB).locator(
      ".item-header-sources",
    );
    await expect(bravoSource).toHaveCount(1);
    await expect(bravoSource).toHaveText("BBBBook pg. 5");
    await expect(bravoSource).not.toContainText("AAABook");
    // The remaining source is carried in the hover tooltip.
    await expect(bravoSource).toHaveAttribute(
      "data-tooltip-html",
      "AAABook pg. 99",
    );

    // The item with an empty sources array shows a blank citation and no tooltip
    // (the shared header always renders the sources slot; it is simply empty).
    const emptySource = rowByName(game, documentBrowser, nameEmpty).locator(
      ".item-header-sources",
    );
    await expect(emptySource).toHaveText("");
    await expect(emptySource).not.toHaveAttribute("data-tooltip-html");
  });

  test("book filter 'only' matches items where the book is a SECONDARY source", async ({
    page: game,
  }) => {
    const token = uniqueName("only");
    const nameA = `${token} alpha`;
    const nameB = `${token} bravo`;
    const nameC = `${token} charlie`;
    // AAABook is alpha's sole source, but bravo's SECOND (secondary) source.
    await createGear(game, nameA, [{ book: "AAABook", page: 10 }]);
    await createGear(game, nameB, [
      { book: "BBBBook", page: 5 },
      { book: "AAABook", page: 99 },
    ]);
    await createGear(game, nameC, [{ book: "CCCBook", page: 1 }]);

    const documentBrowser = await openItemBrowser(game);
    await documentBrowser.locator(".cpr-browser-name-input").fill(token);
    await expect(documentBrowser.locator(".cpr-browser-entry")).toHaveCount(3);

    await expandBookFilter(documentBrowser);
    await cycleTo(bookOption(documentBrowser, "AAABook"), "only");

    // alpha (primary) AND bravo (secondary) match; charlie (no AAABook) does not.
    await expect(documentBrowser.locator(".cpr-browser-entry")).toHaveCount(2);
    await expect(rowByName(game, documentBrowser, nameA)).toBeVisible();
    await expect(rowByName(game, documentBrowser, nameB)).toBeVisible();
    await expect(rowByName(game, documentBrowser, nameC)).toHaveCount(0);
  });

  test("book filter 'exclude' hides every item that cites the book anywhere", async ({
    page: game,
  }) => {
    const token = uniqueName("excl");
    const nameA = `${token} alpha`;
    const nameB = `${token} bravo`;
    const nameC = `${token} charlie`;
    await createGear(game, nameA, [{ book: "AAABook", page: 10 }]);
    await createGear(game, nameB, [
      { book: "BBBBook", page: 5 },
      { book: "AAABook", page: 99 },
    ]);
    await createGear(game, nameC, [{ book: "CCCBook", page: 1 }]);

    const documentBrowser = await openItemBrowser(game);
    await documentBrowser.locator(".cpr-browser-name-input").fill(token);
    await expect(documentBrowser.locator(".cpr-browser-entry")).toHaveCount(3);

    await expandBookFilter(documentBrowser);
    await cycleTo(bookOption(documentBrowser, "AAABook"), "exclude");

    // Both alpha and bravo cite AAABook (even as a secondary) → both hidden.
    await expect(documentBrowser.locator(".cpr-browser-entry")).toHaveCount(1);
    await expect(rowByName(game, documentBrowser, nameC)).toBeVisible();
    await expect(rowByName(game, documentBrowser, nameA)).toHaveCount(0);
    await expect(rowByName(game, documentBrowser, nameB)).toHaveCount(0);
  });

  test("two books set to 'only' show items having EITHER (OR semantics)", async ({
    page: game,
  }) => {
    const token = uniqueName("or");
    const nameA = `${token} alpha`;
    const nameB = `${token} bravo`;
    const nameC = `${token} charlie`;
    await createGear(game, nameA, [{ book: "AAABook", page: 10 }]);
    await createGear(game, nameB, [
      { book: "BBBBook", page: 5 },
      { book: "AAABook", page: 99 },
    ]);
    await createGear(game, nameC, [{ book: "CCCBook", page: 1 }]);

    const documentBrowser = await openItemBrowser(game);
    await documentBrowser.locator(".cpr-browser-name-input").fill(token);
    await expect(documentBrowser.locator(".cpr-browser-entry")).toHaveCount(3);

    await expandBookFilter(documentBrowser);
    await cycleTo(bookOption(documentBrowser, "AAABook"), "only");
    await cycleTo(bookOption(documentBrowser, "CCCBook"), "only");

    // AAABook OR CCCBook covers all three (alpha+bravo via AAABook, charlie via CCC).
    await expect(documentBrowser.locator(".cpr-browser-entry")).toHaveCount(3);
    await expect(rowByName(game, documentBrowser, nameA)).toBeVisible();
    await expect(rowByName(game, documentBrowser, nameB)).toBeVisible();
    await expect(rowByName(game, documentBrowser, nameC)).toBeVisible();
  });

  test("Refresh Index re-indexes edited items: a corrected field updates the row and filter without a reopen", async ({
    page: game,
  }) => {
    const name = uniqueName("misconfigured");
    // The user's scenario: an item created with the wrong source book, spotted
    // and corrected while the document browser is open.
    const wrongBook = uniqueName("WrongBook");
    const fixedBook = uniqueName("FixedBook");
    const id = await createGear(game, name, [{ book: wrongBook, page: 1 }]);

    const documentBrowser = await openItemBrowser(game);
    await documentBrowser.locator(".cpr-browser-name-input").fill(name);
    const row = rowByName(game, documentBrowser, name);
    await expect(row.locator(".item-header-sources")).toContainText(wrongBook);
    await expandBookFilter(documentBrowser);
    await expect(bookOption(documentBrowser, wrongBook)).toBeVisible();

    // Fix the misconfiguration on the item itself. The index tracks the edit in
    // its cache, but nothing re-renders the open document browser — row and filter stay
    // stale until a refresh.
    await game.evaluate(
      ({ id, fixedBook }) =>
        game.items
          .get(id)
          .update({ "system.sources": [{ book: fixedBook, page: 1 }] }),
      { id, fixedBook },
    );
    await expect(row.locator(".item-header-sources")).toContainText(wrongBook);

    // Refresh re-indexes all data and re-renders both results and sidebar: the
    // row now shows the corrected book and the filter list swaps wrong→fixed —
    // no close/reopen.
    await documentBrowser.locator('button[data-action="refreshIndex"]').click();
    await expect(row.locator(".item-header-sources")).toContainText(fixedBook);
    await expect(row.locator(".item-header-sources")).not.toContainText(
      wrongBook,
    );
    await expandBookFilter(documentBrowser);
    await expect(bookOption(documentBrowser, fixedBook)).toBeVisible();
    await expect(bookOption(documentBrowser, wrongBook)).toHaveCount(0);
  });
});
