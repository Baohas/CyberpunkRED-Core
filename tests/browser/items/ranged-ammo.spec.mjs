import {
  test,
  expect,
  createDocumentViaUI,
  expectSheetRendered,
  closeDocSheet,
  uniqueName,
} from "../fixtures.mjs";

/*
 * Toggling a weapon's "Ranged Weapon" setting keeps `ammo` in its allowed
 * installable types in sync (issue #1253): ammo is an installable item type, so
 * a ranged weapon must allow `ammo` to be loaded, and a non-ranged one should
 * not. Driven through the item sheet's settings tab — the same create helper
 * the other item specs use, then the real Ranged Weapon checkbox.
 */
test.describe("ranged weapon allows ammo installs", () => {
  test("ticking/unticking Ranged Weapon adds/removes ammo from allowedTypes", async ({
    game,
  }) => {
    const id = await createDocumentViaUI(game, {
      documentTab: "items",
      type: "weapon",
      name: uniqueName("weapon"),
    });
    const sheetId = await expectSheetRendered(game, {
      collection: "items",
      id,
    });

    // A fresh weapon is not ranged and only allows itemUpgrade.
    const initial = await game.evaluate(
      (itemId) => game.items.get(itemId).system.installedItems.allowedTypes,
      id,
    );
    expect(initial).not.toContain("ammo");

    const settingsTab = game.locator(
      `#${sheetId} a.tab-label[data-tab="item-settings"]`,
    );
    const rangedToggle = game.locator(
      `#${sheetId} a.item-checkbox[data-target="system.isRanged"]`,
    );

    // Tick Ranged Weapon → ammo becomes an allowed install type.
    await settingsTab.click();
    await rangedToggle.click();
    await game.waitForFunction(
      (itemId) => {
        const { system } = game.items.get(itemId);
        return (
          system.isRanged === true &&
          system.installedItems.allowedTypes.includes("ammo")
        );
      },
      id,
      { timeout: 10000 },
    );

    // Untick Ranged Weapon → ammo is removed again (itemUpgrade stays).
    await settingsTab.click();
    await rangedToggle.click();
    await game.waitForFunction(
      (itemId) => {
        const { system } = game.items.get(itemId);
        return (
          system.isRanged === false &&
          !system.installedItems.allowedTypes.includes("ammo") &&
          system.installedItems.allowedTypes.includes("itemUpgrade")
        );
      },
      id,
      { timeout: 10000 },
    );

    await closeDocSheet(game, { collection: "items", id });
  });
});
