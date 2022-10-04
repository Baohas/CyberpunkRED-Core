/* eslint-disable no-await-in-loop */
/* global Combat game */
import LOGGER from "../utils/cpr-logger.js";
import CombatUtils from "../utils/cpr-combatUtils.js";
import CPRChat from "../chat/cpr-chat.js";
import DiceSoNice from "../extern/cpr-dice-so-nice.js";
import SelectInitiativeType from "../dialog/cpr-initiative-type-prompt.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * A custom class so we can override initiative behaviors for Black-ICE and Demons.
 * According to the rules, these actors do not "roll" an initiative, instead they
 * get put "at the top", with an initiative value 1 better than whoever else is
 * currently first on the list. Foundry does not support this natively, so we
 * override the _getInitiativeFormula to address that.
 *
 * @extends
 */
export default class CPRCombat extends Combat {
  /**
   * Here is where the Black-ICE and Demon initiative behavior is implemented. If nothing
   * has an initiative set, the program gets "30", which should be high enough to always
   * be at the top. Otherwise we take the best, and increase it by 1.
   *
   * For all other actor types, the initiative is the system default (defined in system.json),
   * or the Foundry default if that is not specified.
   *
   * @param {*} combatant - the combatant object "rolling" for initiative
   * @returns - a string representation of the roll formula for the initiative. "30" is a
   *            valid formula, which is treated like a constant.
   */
  static _getInitiativeFormula(combatant) {
    LOGGER.trace("_getInitiativeFormula | CPRCombat | Called.");
    if (combatant.actor.type === "blackIce" || combatant.actor.type === "demon") {
      const bestInit = CombatUtils.GetBestInit();
      if (!bestInit) return "30";
      if (bestInit !== combatant.initiative) {
        return String(bestInit + 1);
      }
      return String(combatant.initiative);
    }
    return "1d10";
  }

  /**
   * Roll initiative for one or multiple Combatants within the Combat entity
   *
   * @param {string|string[]} ids     A Combatant id or Array of ids for which to roll
   * @param {object} [options={}]     Additional options which modify how initiative rolls are created or presented.
   * @param {string|null} [options.formula]         A non-default initiative formula to roll. Otherwise the system default is used.
   * @param {boolean} [options.updateTurn=true]     Update the Combat turn after adding new initiative scores to keep the turn on the same Combatant.
   * @param {object} [options.messageOptions={}]    Additional options with which to customize created Chat Messages
   * @return {Promise<Combat>}        A promise which resolves to the updated Combat entity once updates are complete.
   */
  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    LOGGER.trace("rollInitiative | CPRCombat | Called.");
    // Structure input data
    const combatantIds = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant.id;

    // Iterate over Combatants, performing an initiative roll for each
    const updates = [];
    const rolls = [];
    let initiativeType;
    for (const [i, id] of combatantIds.entries()) {
      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) return;

      // See what type of initiative for characters & mooks if they have an equipped cyberdeck
      const { actor } = combatant.token;
      switch (actor.type) {
        case "character":
        case "mook": {
          if (actor.hasItemTypeEquipped("cyberdeck")) {
            if (typeof initiativeType === "undefined") {
              // Check if this is a meat initiative roll or net initiative roll
              let formData = { title: SystemUtils.Format("CPR.dialog.initiativeType.initiativeType"), initiativeType: "meat" };
              formData = await SelectInitiativeType.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
              if (formData === undefined) {
                return;
              }
              initiativeType = formData.initiativeType;
            }
          } else {
            initiativeType = "meat";
          }
          break;
        }
        case "blackIce":
        case "demon": {
          initiativeType = "net";
          break;
        }
        case "container": {
          initiativeType = "none";
          break;
        }
        default:
          initiativeType = "meat";
      }

      if (initiativeType !== "none") {
        // Produce an initiative roll for the Combatant
        const cprRoll = (await combatant.getInitiativeRoll(CPRCombat._getInitiativeFormula(combatant), initiativeType));

        updates.push({ _id: id, initiative: cprRoll.resultTotal });

        cprRoll.entityData = { actor: combatant.actor?.id, token: combatant.token?.id };
        rolls.push(cprRoll);
      } else {
        const warningMessage = `${SystemUtils.Localize("CPR.messages.invalidCombatantType")}: ${actor.name} (${actor.type})`;
        SystemUtils.DisplayMessage("warn", warningMessage);
      }
    }

    const rollCriticals = game.settings.get("cyberpunk-red-core", "criticalInitiative");
    const dsnPromises = [];
    rolls.forEach((d) => {
      dsnPromises.push(DiceSoNice.ShowDiceSoNice(d._roll));
      if (rollCriticals && d.wasCritical()) {
        dsnPromises.push(DiceSoNice.ShowDiceSoNice(d._critRoll));
      }
    });

    await Promise.all(dsnPromises);

    rolls.forEach((d) => {
      CPRChat.RenderRollCard(d);
    });

    if (!updates.length) return;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);

    // Ensure the turn order remains with the same combatant
    if (updateTurn) {
      await this.update({ turn: this.turns.findIndex((t) => t.id === currentId) });
    }
  }
}
