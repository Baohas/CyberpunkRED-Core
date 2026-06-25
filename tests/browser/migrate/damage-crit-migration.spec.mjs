import { test, expect } from "../fixtures.mjs";

/*
 * Unit test for migration 042 (AddDamageCritConfig): it backfills the configurable damage-crit fields
 * on weapons (system.damageCrit) and ammo (system.overrides.crit) with RAW defaults, and is idempotent
 * (it never clobbers values that are already present).
 */

test("042 migration backfills damage-crit fields, idempotently", async ({
  game,
}) => {
  const out = await game.evaluate(async () => {
    const M = await import(
      `/systems/${game.system.id}/modules/system/migrate/scripts/042-add-damage-crit-config.js`
    );
    const migration = new M.default();

    const weapon = { type: "weapon", system: {} };
    const ammo = { type: "ammo", system: { overrides: {} } };
    const weaponWithExisting = {
      type: "weapon",
      system: { damageCrit: { threshold: 5, count: 3, bonus: 10 } },
    };

    await migration.updateItem(weapon);
    await migration.updateItem(ammo);
    await migration.updateItem(weaponWithExisting);

    return {
      version: M.default.version,
      weaponCrit: weapon.system.damageCrit,
      ammoCrit: ammo.system.overrides.crit,
      preserved: weaponWithExisting.system.damageCrit,
    };
  });

  expect(out.version).toBe(42);
  expect(out.weaponCrit).toEqual({ threshold: 0, count: 2, bonus: 5 });
  expect(out.ammoCrit).toEqual({
    override: false,
    threshold: 0,
    count: 2,
    bonus: 5,
  });
  // Existing config must not be overwritten.
  expect(out.preserved).toEqual({ threshold: 5, count: 3, bonus: 10 });
});
