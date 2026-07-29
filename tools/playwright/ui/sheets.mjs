import { expect } from "@playwright/test";

export async function expectSheetRendered(page, { collection, id }) {
  await page.waitForFunction(
    ({ collection, id }) => {
      const doc = (collection === "actors" ? game.actors : game.items).get(id);
      return doc?.sheet?.rendered === true;
    },
    { collection, id },
    { timeout: 15000 },
  );

  const elementId = await page.evaluate(
    ({ collection, id }) => {
      const doc = (collection === "actors" ? game.actors : game.items).get(id);
      return doc.sheet.element?.id ?? null;
    },
    { collection, id },
  );

  expect(elementId).toBeTruthy();
  await expect(page.locator(`#${elementId}`)).toBeVisible();
  return elementId;
}

export async function closeDocSheet(page, { collection, id }) {
  await page.evaluate(
    ({ collection, id }) => {
      const doc = (collection === "actors" ? game.actors : game.items).get(id);
      const sheet = doc?.sheet;
      if (!sheet) return undefined;
      try {
        sheet.options.submitOnClose = false;
      } catch {
        /* AppV2 options are frozen and have no submitOnClose; close() is safe */
      }
      return sheet.close();
    },
    { collection, id },
  );
}

async function dismissNotifications(page) {
  await page.evaluate(() => {
    try {
      globalThis.ui?.notifications?.clear?.();
    } catch {
      /* older build without clear(); the wait/strip below still handle it */
    }
  });
  await page
    .waitForFunction(() => !document.querySelector(".notification"), null, {
      timeout: 6000,
    })
    .catch(() => {});
  await page.evaluate(() => {
    document
      .querySelectorAll(".notification")
      .forEach((toast) => toast.remove());
  });
}

export async function captureSheet(page, sheetId, name) {
  await dismissNotifications(page);
  await page.locator(`#${sheetId}`).screenshot({
    path: `.playwright/test-results/sheets/${name}.png`,
  });
}
