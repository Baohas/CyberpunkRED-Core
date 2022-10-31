/* global game FormApplication mergeObject */
import CPR from "../system/config.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Defines behaviors for a window that pops up when the Critical Injuries button in
 * system settings is clicked. We go this route because the options available are
 * based on content in game.packs, but game.packs is not defined when settings are
 * configured. So we have present options dynamically when a button is clicked.
 */
export default class CPRInjurySettings extends FormApplication {
  /**
   * set up default things like the html template and window size
   *
   * @override
   * @static
   */
  static get defaultOptions() {
    LOGGER.trace("CPRInjurySettings | defaultOptions | called.");
    return mergeObject(super.defaultOptions, {
      title: SystemUtils.Localize("CPR.settings.criticalInjuryRollTableCompendium.title"),
      id: "injury-config",
      template: `systems/${game.system.id}/templates/apps/critical-injury-settings.hbs`,
      width: "auto",
      height: "auto",
      closeOnSubmit: true,
    });
  }

  /**
   * When this application (read: form window) is launched, create the data object that is
   * consumed by the handle bars template to present options to the user. This populates
   * the select menu, and looks like this: {settingValue: humanReadableString}
   *
   * @async
   * @override
   * @param {Object} options (not used here)
   * @returns {Object}
   */
  // eslint-disable-next-line class-methods-use-this
  async getData() {
    LOGGER.trace("CPRInjurySettings | getData | called.");
    const current = await game.settings.get(game.system.id, "criticalInjuryRollTableCompendium");
    const tables = { [CPR.defaultCriticalInjuryTable]: "CPR.settings.criticalInjuryRollTableCompendium.default" };
    const comps = SystemUtils.GetWorldCompendia("RollTable");
    for (const comp of comps) tables[`world.${comp.metadata.name}`] = comp.metadata.label;
    return { choices: tables, current };
  }

  /**
   * Called when the sub menu application (this thing) is submitted. Responsible for updating
   * internal settings with what the user chose.
   *
   * @async
   * @override
   * @param {*} event
   * @param {*} formData
   */
  // eslint-disable-next-line class-methods-use-this
  async _updateObject(event, formData) {
    LOGGER.trace("CPRInjurySettings | _updateObject | called.");
    await game.settings.set(game.system.id, "criticalInjuryRollTableCompendium", formData.injuryChoice);
    SystemUtils.DisplayMessage("notify", SystemUtils.Localize("CPR.settings.criticalInjuryRollTableCompendium.update"));
  }
}
