import { expect } from "@playwright/test";
import { createDocumentViaUI } from "./documents.mjs";

export const ITEM_TYPES = [
  "ammo",
  "armor",
  "clothing",
  "criticalInjury",
  "cyberdeck",
  "cyberware",
  "drug",
  "gear",
  "itemUpgrade",
  "netarch",
  "program",
  "role",
  "skill",
  "vehicle",
  "weapon",
];

export async function createItemViaUI(page, { type, name }) {
  return createDocumentViaUI(page, { documentTab: "items", type, name });
}

export async function openItemSettings(page, sheetId) {
  const sheet = page.locator(`#${sheetId}`);
  const tab = sheet.locator('a.tab-label[data-tab="item-settings"]');
  await tab.click();
  await expect(tab).toHaveClass(/active/);
  return sheet;
}

export async function setItemField(
  page,
  { sheetId, itemId, name, path, value },
) {
  const sheet = await openItemSettings(page, sheetId);
  const input = sheet.locator(`input[name="${name}"]`);
  await expect(input).toBeVisible();
  await input.fill(String(value));
  await input.press("Tab");
  await page.waitForFunction(
    ({ itemId, path, value }) =>
      foundry.utils.getProperty(game.items.get(itemId), path) === value,
    { itemId, path, value },
    { timeout: 10000 },
  );
}
