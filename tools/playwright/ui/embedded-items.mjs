import { expect } from "@playwright/test";
import { openSidebarTab } from "./sidebar.mjs";

export const DROP_TAB_BY_TYPE = {
  ammo: "gear",
  armor: "gear",
  clothing: "gear",
  cyberdeck: "gear",
  cyberware: "gear",
  drug: "gear",
  gear: "gear",
  itemUpgrade: "gear",
  netarch: "gear",
  program: "gear",
  vehicle: "gear",
  weapon: "gear",
  skill: "skills",
  role: "role",
  criticalInjury: "fight",
};

async function waitForItemCount(page, actorId, target, timeout) {
  try {
    await page.waitForFunction(
      ({ actorId, target }) => game.actors.get(actorId).items.size >= target,
      { actorId, target },
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

export async function dragItemToActorSheet(page, { itemId, sheetId, actorId }) {
  await openSidebarTab(page, "items");
  const entry = page.locator(`#items [data-entry-id="${itemId}"]`);
  await expect(entry).toBeVisible();
  const sheetEl = page.locator(`#${sheetId}`);
  await expect(sheetEl).toBeVisible();

  const before = await page.evaluate(
    (id) => game.actors.get(id).items.size,
    actorId,
  );

  await entry.dragTo(sheetEl, { timeout: 5000 }).catch(() => {});
  await page.mouse.up().catch(() => {});

  if (await waitForItemCount(page, actorId, before + 1, 3000)) return;

  const uuid = await page.evaluate((id) => game.items.get(id).uuid, itemId);
  await page.evaluate(
    ({ uuid, sheetId, actorId, before }) => {
      if (game.actors.get(actorId).items.size > before) return;
      const sheetEl = document.getElementById(sheetId);
      const data = new DataTransfer();
      data.setData("text/plain", JSON.stringify({ type: "Item", uuid }));
      sheetEl.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: data,
        }),
      );
    },
    { uuid, sheetId, actorId, before },
  );

  if (!(await waitForItemCount(page, actorId, before + 1, 5000))) {
    throw new Error(`Item ${itemId} was not embedded on actor ${actorId}`);
  }
}
