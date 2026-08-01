import * as CPRRolls from "../rolls/cpr-rolls.js";
import CPR from "../system/config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import CPRNetActor from "./cpr-net-actor.js";

/**
 * Demons are very simple stand-alone actors right now, sharing the NET-entity base with Black ICE.
 *
 * @extends {CPRNetActor}
 */
export default class CPRDemonActor extends CPRNetActor {
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
}
