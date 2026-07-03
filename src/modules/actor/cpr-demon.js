import * as CPRRolls from "../rolls/cpr-rolls.js";
import CPR from "../system/config.js";
import CPRChat from "../chat/cpr-chat.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Demons are very simple stand-alone actors right now.
 *
 * @extends {Actor}
 */
export default class CPRDemonActor extends Actor {
  /**
   * Set the REZ stat as the token's resource bar on a newly-created Demon actor. Applied only to a
   * genuinely-new actor (a duplicate/import keeps its own token).
   *
   * @async
   * @override
   * @param {object} data - the creation data
   * @param {object} options - creation options
   * @param {User} user - the user requesting the creation
   * @returns {Promise<boolean|void>} false aborts creation
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (!data.items?.length) {
      this.updateSource({
        prototypeToken: { bar1: { attribute: "stats.rez" } },
      });
    }
    return allowed;
  }

  /**
   * Very simple code to roll a stat
   *
   * @param {String} statName - the name of the stat being rolled
   * @returns {CPRProgramStatRoll}
   */
  createStatRoll(statName) {
    const niceStatName = SystemUtils.Localize(CPR.demonStatList[statName]);
    const statValue = parseInt(this.system.stats[statName], 10);
    const cprRoll = CPRRolls.CPRProgramStatRoll.create(niceStatName, statValue);

    if (!cprRoll.rollCardExtraArgs.program) {
      cprRoll.rollCardExtraArgs.program = {
        system: {
          class: "demon",
          damage: "blackice",
        },
      };
    }

    return cprRoll;
  }

  /**
   * Apply damage to the rez of the deamon.
   * @param {int} damage - direct damage dealt
   */
  async _applyDamage(damage) {
    // As a Demon does not have any armor, and do not suffer crit damage, the damage will be simply subtracted from the REZ.
    const currentRez = this.system.stats.rez.value;
    await this.update({
      "system.stats.rez.value": currentRez - damage,
    });
    CPRChat.RenderDamageApplicationCard({
      actor: this,
      hpReduction: damage,
      rezReduction: true,
    });
  }

  /**
   * Reverse rez damage to the actor, in case someone made a mistake applying it.
   *
   * @param {int} rezReduction - value of the damage taken
   */
  async _reverseDamage(rezReduction) {
    const currentRez = this.system.stats.rez.value;
    const updatedRez = Math.min(
      currentRez + rezReduction,
      this.system.stats.rez.max,
    );
    await this.update({ "system.stats.rez.value": updatedRez });
  }

  /**
   * Given a stat name, return the value of it off the actor
   *
   * @param {String} statName - name (from CPR.statList) of the stat to retrieve
   * @returns {Number}
   */
  getStat(statName) {
    const statValue =
      statName === "rez"
        ? this.system.stats[statName].value
        : this.system.stats[statName];
    return parseInt(statValue, 10);
  }
}
