import CPRActor from "./cpr-actor.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Character actors are generally represented by players, but for especially detailed NPCs,
 * they are appropriate too. Characters are the most complex actors in the system.
 *
 * @extends {Actor}
 */
export default class CPRCharacterActor extends CPRActor {
  /**
   * create() is called when creating the actor, but it's not the same as a constructor. In the
   * code here, we pre-populate characters with skills, core cyberware, and other baked-in items.
   * We also pre-configure a few token options to reduce repetitive clicking, such as setting HP
   * as a resource bar.
   *
   * @async
   * @static
   * @param {Object} data - a complex structure with details and data to stuff into the actor object
   * @param {Object} options - not used here, but required by the parent class
   */
  static async create(data, options) {
    LOGGER.trace("create | CPRCharacterActor | called.");
    const createData = data;
    if (typeof data.system === "undefined") {
      LOGGER.trace("create | New Actor | CPRCharacterActor | called.");
      createData.items = [];
      const tmpItems = data.items.concat(await SystemUtils.GetCoreSkills(), await SystemUtils.GetCoreCyberware());
      tmpItems.forEach((item) => {
        const cprItem = {
          name: item.name,
          img: item.img,
          type: item.type,
          system: item.system,
        };
        createData.items.push(cprItem);
      });
      createData.token = {
        actorLink: true,
        disposition: 1,
        vision: true,
        bar1: { attribute: "derivedStats.hp" },
      };
    }
    super.create(createData, options);
  }

  /**
   * Automatically calculate "derived" stats based on changes to other stats. This includes max HP,
   * Humanity, Empathy, and Death Saves. None of the automation happens if a player disabled it in
   * their client settings.
   */
  _calculateDerivedStats() {
    LOGGER.trace("_calculateDerivedStats | CPRCharacterActor | Called.");
    const cprData = this.system;
    const { derivedStats } = cprData;

    // Walk & Run
    // From the Move/Run Action (pg 127)
    derivedStats.walk.value = cprData.stats.move.value * 2;
    derivedStats.run.value = cprData.stats.move.value * 4;

    // Seriously wounded
    derivedStats.seriouslyWounded = Math.ceil(derivedStats.hp.max / 2);

    // We need to always call this because if the actor was wounded and now is not, their
    // value would be equal to max, however their current wound state was never updated.
    this._setWoundState();
    // Updated derivedStats variable with currentWoundState
    derivedStats.currentWoundState = cprData.derivedStats.currentWoundState;

    // Death save
    let basePenalty = this.bonuses.deathSavePenalty; // 0 + active effects
    const critInjury = this.itemTypes.criticalInjury;
    critInjury.forEach((criticalInjury) => {
      const { deathSaveIncrease } = criticalInjury.system;
      if (deathSaveIncrease) {
        basePenalty += 1;
      }
    });

    // We need to check this because the object is instantiated by the entity factory
    // prior to migration and this data point changed from a type number to an type object
    // which gets fixed during migration
    if ((typeof derivedStats.deathSave) === "object") {
      derivedStats.deathSave.basePenalty = basePenalty;
      derivedStats.deathSave.value = derivedStats.deathSave.penalty + derivedStats.deathSave.basePenalty;
      this.system.derivedStats = derivedStats;
    }
    derivedStats.hp.value = Math.min(
      derivedStats.hp.value,
      derivedStats.hp.max,
    );
    if (derivedStats.humanity.value > derivedStats.humanity.max) {
      derivedStats.humanity.value = derivedStats.humanity.max;
    }
  }
}
