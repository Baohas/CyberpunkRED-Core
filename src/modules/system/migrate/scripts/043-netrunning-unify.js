/* eslint-disable no-await-in-loop */
import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

/**
 * Netrunning unification: every NET entity becomes a Program item. Convert any world
 * `blackIce` and `demon` actors into `program` items (class "blackice" / "demon") so no data
 * is lost, then delete the source actors. The actor types remain registered (deprecated,
 * hidden from the create dialog) so this migration can load them and un-migrated worlds don't
 * error; the types are removed in a later version.
 *
 * The netarch floor reshape and the new cyberdeck `range` field are handled by the data
 * models' `migrateData`/field defaults on load, so they need no logic here.
 */
export default class NetrunningUnifyMigration extends BaseMigrationScript {
  static version = 43;

  static name = "Netrunning: Unify Black ICE & Demons into Programs";

  async migrateMisc() {
    const toConvert = game.actors.filter(
      (a) => a.type === "blackIce" || a.type === "demon",
    );
    for (const actor of toConvert) {
      const src = actor.toObject();
      const programData =
        actor.type === "blackIce"
          ? NetrunningUnifyMigration.#blackIceToProgram(src)
          : NetrunningUnifyMigration.#demonToProgram(src);
      try {
        await Item.create(programData);
        await actor.delete();
      } catch (err) {
        LOGGER.error(
          `043-netrunning-unify | failed to convert ${actor.type} "${actor.name}": ${err}`,
        );
      }
    }
  }

  /** Map a legacy blackIce actor's source data to a black-ice-class Program item. */
  static #blackIceToProgram(src) {
    const s = src.system ?? {};
    const stats = s.stats ?? {};
    return {
      name: src.name,
      img: src.img,
      type: "program",
      system: {
        class: "blackice",
        blackIceType: s.class ?? "antipersonnel",
        atk: stats.atk ?? 0,
        def: stats.def ?? 0,
        per: stats.per ?? 0,
        spd: stats.spd ?? 0,
        rez: stats.rez ?? { value: 10, max: 10 },
        description: s.notes ? { value: s.notes } : undefined,
      },
    };
  }

  /** Map a legacy demon actor's source data to a demon-class Program item. */
  static #demonToProgram(src) {
    const s = src.system ?? {};
    const stats = s.stats ?? {};
    return {
      name: src.name,
      img: src.img,
      type: "program",
      system: {
        class: "demon",
        interface: stats.interface ?? 0,
        combatNumber: stats.combatNumber ?? 0,
        actions: stats.actions ?? 0,
        rez: stats.rez ?? { value: 10, max: 10 },
        description: s.notes ? { value: s.notes } : undefined,
      },
    };
  }
}
