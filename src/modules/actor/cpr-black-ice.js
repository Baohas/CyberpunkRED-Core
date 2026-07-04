import * as CPRRolls from "../rolls/cpr-rolls.js";
import CPR from "../system/config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import CPRNetActor from "./cpr-net-actor.js";

/**
 * Black-ICE actors extend the shared NET-entity base (which extends Foundry's Actor directly). They
 * have very little in common with Characters or Mooks.
 *
 * @extends {CPRNetActor}
 */
export default class CPRBlackIceActor extends CPRNetActor {
  /**
   * Black-ICE really only uses 2 types of rolls: stat and damage. A trimmed down version
   * of the roll code in cpr-actor.js is implemented here.
   *
   * @param {String} statName - name of the stat being rolled (DEF, ATK, etc)
   * @returns {CPRProgramStatRoll}
   */
  createStatRoll(statName) {
    const niceStatName = SystemUtils.Localize(CPR.blackIceStatList[statName]);
    const statValue = parseInt(this.system.stats[statName], 10);
    const cprRoll = CPRRolls.CPRProgramStatRoll.create(niceStatName, statValue);
    if (
      this.isToken &&
      typeof this.token.flags[game.system.id] !== "undefined"
    ) {
      const cprFlags = this.token.flags[game.system.id];
      if (typeof cprFlags.program !== "undefined") {
        cprRoll.rollCardExtraArgs.program = foundry.utils.duplicate(
          cprFlags.program,
        );
      }
    }

    if (!cprRoll.rollCardExtraArgs.program) {
      cprRoll.rollCardExtraArgs.program = {
        system: {
          blackIceType: this.system.class,
          class: "blackice",
          damage: "blackice",
        },
      };
    }
    return cprRoll;
  }

  /**
   * See createStatRoll
   *
   * @param {String} programUUID - Id for the program item doing the damage
   * @param {String} netrunnerTokenId - The token Id of the netrunner that supposedly owns the program item
   * @param {String} sceneId - the scene Id, used to find the token
   * @returns {CPRDamageRoll}
   */
  createDamageRoll(programUUID, netrunnerTokenId, sceneId) {
    let program;
    if (netrunnerTokenId) {
      const sceneList = sceneId
        ? game.scenes.filter((s) => s.id === sceneId)
        : game.scenes;
      let netrunnerToken;
      sceneList.forEach((scene) => {
        const tokenList = scene.tokens.filter((t) => t.id === netrunnerTokenId);
        if (tokenList.length === 1) {
          [netrunnerToken] = tokenList;
        }
      });
      if (netrunnerToken) {
        program = netrunnerToken.actor.getOwnedItem(programUUID);
      }
    } else {
      const programList = game.items.filter((i) => i.uuid === programUUID);
      if (programList.length === 1) {
        [program] = programList;
      }
    }

    let damageFormula = "1d6";
    let programName = this.name;
    let programData = {};
    if (program) {
      damageFormula =
        this.system.class === "antiprogram"
          ? program.system.damage.blackIce
          : program.system.damage.standard;
      programName = program.name;
      programData = program.system;
    }

    const cprRoll = CPRRolls.CPRDamageRoll.create(
      programName,
      damageFormula,
      "program",
    );
    cprRoll.rollCardExtraArgs.program = programData;
    return cprRoll;
  }
}
