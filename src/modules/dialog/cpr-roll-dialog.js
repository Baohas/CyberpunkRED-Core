/* eslint-disable max-classes-per-file */
/* global */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import CPRDialog from "./cpr-dialog-application.js";

export class CPRRollDialog extends CPRDialog {
  constructor(rollData, actor, item, options) {
    LOGGER.trace("constructor | CPRRollDialog | Called.");

    super(rollData, options);

    // Set data and options specific to this subclass.
    this.options.title = rollData.rollTitle;
    this.rollData = rollData;

    // Get the whole prototype chain so we know what kind of roll this is, and what its parent classes are.
    // Adapted from this comment: https://stackoverflow.com/a/70089208
    const prototypeChain = [];
    let currentPrototype = rollData;
    while (currentPrototype) {
      currentPrototype = Object.getPrototypeOf(currentPrototype);
      if (currentPrototype && currentPrototype.constructor.name !== "Object") {
        prototypeChain.push(currentPrototype?.constructor.name);
      }
    }

    this.prototypeChain = prototypeChain;

    // Set template.
    this.options.template = rollData.rollPrompt;

    this.actor = actor;
    this.item = item;
  }

  getData() {
    LOGGER.trace("getData | CPRRollDialog | called.");
    const data = super.getData();
    data.rollData = this.rollData; // CPRRoll object
    data.prototypeChain = this.prototypeChain;

    // Get effects relevant to the roll.
    const effects = this.actor.effects.contents;
    const filteredEffects = [];

    if (this.prototypeChain.includes("CPRDamageRoll")) {
      const damageEffects = effects.filter((e) => e.changes.some((c) => c.key === `system.stats.bonuses.universalDamage`));
      damageEffects.forEach((e) => filteredEffects.push(e));
    }

    // Stat Effects. (This should either not be included or refactored, since the bonus is already applied via the native active effects.)
    if (this.prototypeChain.includes("CPRStatRoll") || this.prototypeChain.includes("CPRRoleRoll")) {
      const statEffects = effects.filter((e) => e.changes.some((c) => c.key === `system.stats.${this.rollData.statName.toLowerCase()}.value`));
      statEffects.forEach((e) => filteredEffects.push(e));
    }

    // Skill Effects.
    if (this.prototypeChain.includes("CPRSkillRoll") || this.prototypeChain.includes("CPRRoleRoll")) {
      const skillEffects = effects.filter((e) => e.changes.some((c) => c.key === `bonuses.${SystemUtils.slugify(this.rollData.skillName)}`));
      skillEffects.forEach((e) => filteredEffects.push(e));
    }

    // Combat Effects.
    const combatEffects = [];
    data.activeEffects = filteredEffects;
    return data;
  }

  /**
   *
   * @param {*} html
   * @override
   */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRRollDialog | Called.");
    super.activateListeners(html);
    if (!this.options.editable) return;

    // html.find(".item-checkbox").click((event) => this._itemCheckboxToggle(event));
    html.find(".active-effect-checkbox").click((event) => this._activeEffectToggle(event));
    html.find(".aimed-checkbox").click((event) => this._aimedToggle(event));
  }

  /**
   * When the aimed shot checkbox is toggled, it shows the drop down for aim location, but `cprRoll.location` is not
   * actually updated until the next time the form is submitted. Unfortunately, when the OK button is pressed, the
   * Promise is returned before the form is resubmitted. So, if a user toggles aimed shot but doesn't change any
   * other data before pressing OK, the location is still set to "body". This function sets `cprRoll.location` to
   * head when the toggle is checked and back to body when the toggle is unchecked, fixing the above issue (until
   * I can figure out how to resolve the Promise after the form is submitted.)
   *
   * @param {*} event
   */
  _aimedToggle(event) {
    LOGGER.trace("_aimedToggle | CPRRollDialog | Called.");
    if (this.rollData.isAimed) {
      this.rollData.location = "body";
    } else {
      this.rollData.location = "head";
    }
  }

  _activeEffectToggle(event) {
    LOGGER.trace("_activeEffectToggle | CPRDialog | Called.");
    const value = parseInt(SystemUtils.GetEventDatum(event, "data-value"), 10);
    this.rollData.addMod(value);
    this.render();
  }
}

export class CPRRoleRollDialog extends CPRRollDialog {

}
