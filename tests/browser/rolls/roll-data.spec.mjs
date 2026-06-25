import { test, expect } from "../fixtures.mjs";

/*
 * Verifies @-references resolve in roll formulas via the actor's roll data (e.g.
 * `/r 1d10red + @stats.ref.value + @skills.handgun.level`). Foundry's default getRollData returns the
 * actor's system data, which already exposes stats and the datamodel's `skills` getter, so no override
 * is needed — this guards that the data stays reachable for formula references.
 */

test("@stats and @skills resolve in roll formulas", async ({ game }) => {
  const result = await game.evaluate(async () => {
    const actor = await Actor.create({ name: "rd-test", type: "character" });
    await actor.update({ "system.stats.ref.value": 7 });
    await actor.createEmbeddedDocuments("Item", [
      { name: "Handgun", type: "skill", system: { level: 5, stat: "ref" } },
    ]);

    const rd = actor.getRollData();
    const ref = rd.stats?.ref?.value;
    const handgunLevel = rd.skills?.handgun?.level;

    const roll = await new Roll(
      "1d10 + @stats.ref.value + @skills.handgun.level",
      rd,
    ).evaluate();

    const out = {
      ref,
      handgunLevel,
      total: roll.total,
      diceTotal: roll.dice[0].total,
    };
    await actor.delete();
    return out;
  });

  expect(result.ref).toBe(7);
  expect(result.handgunLevel).toBe(5);
  // The @-refs resolved to 7 (stat) and 5 (skill level) on top of the d10.
  expect(result.total).toBe(result.diceTotal + 12);
});
