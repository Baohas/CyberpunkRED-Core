/**
 * Keep `ammo` in a ranged item's allowed installable types in sync with the
 * "Ranged Weapon" (`system.isRanged`) toggle. Ammo is an installable item type,
 * so a ranged weapon must allow `ammo` for it to be loaded, and a non-ranged
 * item should not. Applies to any container item that can be ranged (weapon,
 * cyberware, itemUpgrade). See #1253.
 *
 * @public
 * @memberof hookEvents
 */
const SyncAmmoAllowedType = () => {
  /**
   * Add or remove `ammo` from `allowedTypes` in the same write that flips
   * `isRanged`, so the change is atomic and the sheet reflects it immediately.
   * preUpdate fires only on the initiating client, so this runs once.
   */
  Hooks.on("preUpdateItem", (item, changed) => {
    const newIsRanged = foundry.utils.getProperty(changed, "system.isRanged");
    // Act only on a genuine transition. The item sheet's checkbox handler
    // resends the whole item on every checkbox click, so `isRanged` is often
    // present but unchanged; non-container items have no allowedTypes to sync.
    if (
      newIsRanged === undefined ||
      newIsRanged === item.system.isRanged ||
      !item.system.installedItems
    ) {
      return;
    }

    const current =
      foundry.utils.getProperty(
        changed,
        "system.installedItems.allowedTypes",
      ) ??
      item.system.installedItems.allowedTypes ??
      [];
    const allowedTypes = newIsRanged
      ? Array.from(new Set([...current, "ammo"]))
      : current.filter((type) => type !== "ammo");
    foundry.utils.setProperty(
      changed,
      "system.installedItems.allowedTypes",
      allowedTypes,
    );
  });

  /**
   * When ranged is switched off, unload and uninstall any loaded ammo (loading
   * a weapon installs the ammo item, so uninstalling it returns the rounds).
   * This mutates the ammo document, so it cannot run in preUpdate; the userId
   * guard keeps only the initiating client from performing it.
   */
  Hooks.on("updateItem", async (item, changed, options, userId) => {
    if (userId !== game.user.id) return;
    if (foundry.utils.getProperty(changed, "system.isRanged") !== false) return;
    if (typeof item.getInstalledItems !== "function") return;
    const installedAmmo = item.getInstalledItems("ammo");
    if (installedAmmo.length > 0) {
      await item.uninstallItems(installedAmmo);
    }
  });
};

export default SyncAmmoAllowedType;
