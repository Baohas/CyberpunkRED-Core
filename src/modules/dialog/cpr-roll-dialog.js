/* eslint-disable max-classes-per-file */
/* global duplicate game */
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

  /**
   * Prepares data for roll dialog sheet.
   */
  getData() {
    LOGGER.trace("getData | CPRRollDialog | called.");
    const data = super.getData();
    data.rollData = this.rollData; // CPRRoll object
    data.actor = this.actor;
    data.prototypeChain = this.prototypeChain;

    // Get effects relevant to the roll.
    const effects = this.actor.effects.contents;
    const filteredEffects = [];

    if (this.prototypeChain.includes("CPRDamageRoll")) {
      const damageEffects = effects.filter((e) => e.changes.some((c) => c.key === `system.stats.bonuses.universalDamage`));
      damageEffects.forEach((e) => filteredEffects.push(e));
    }

    if (this.prototypeChain.includes("CPRAttackRoll")) {
      const attackEffects = effects.filter((e) => e.changes.some((c) => c.key === `bonuses.ranged`));
      attackEffects.forEach((e) => filteredEffects.push(e));
    }

    // Stat Effects. (This should either not be included or refactored, since the bonus is already applied via the native active effects.)
    if ((this.prototypeChain.includes("CPRStatRoll") || this.prototypeChain.includes("CPRRoleRoll")) && !this.prototypeChain.includes("CPRCyberdeckRoll")) {
      const statEffects = effects.filter((e) => e.changes.some((c) => c.key === `system.stats.${this.rollData.statName.toLowerCase()}.value`));
      statEffects.forEach((e) => {
        e.changes.forEach((c, v) => {
          c.isSituational = e.flags[`${game.system.id}`].changes.situational[v].isSituational;
        });

        const updatedEffect = {};
        updatedEffect.changes = e.changes.filter((c) => c.key === `system.stats.${this.rollData.statName.toLowerCase()}.value`);
        updatedEffect.flags = e.flags;
        updatedEffect.id = e.id;
        updatedEffect.label = e.label;

        filteredEffects.push(updatedEffect);
      });
    }

    // Skill Effects.
    if ((this.prototypeChain.includes("CPRSkillRoll") || this.prototypeChain.includes("CPRRoleRoll")) && !this.prototypeChain.includes("CPRCyberdeckRoll")) {
      const skillEffects = effects.filter((e) => e.changes.some((c) => c.key === `bonuses.${SystemUtils.slugify(this.rollData.skillName)}`));
      skillEffects.forEach((e) => {
        e.changes.forEach((c, v) => {
          c.isSituational = e.flags[`${game.system.id}`].changes.situational[v].isSituational;
        });

        const updatedEffect = {};
        updatedEffect.changes = e.changes.filter((c) => c.key === `bonuses.${SystemUtils.slugify(this.rollData.skillName)}`);
        updatedEffect.flags = e.flags;
        updatedEffect.id = e.id;
        updatedEffect.label = e.label;

        filteredEffects.push(updatedEffect);
      });
    }

    filteredEffects.filter((e) => {
      const flag = this.actor.getFlag("cyberpunk-red-core", `isSituational-${e.id}`);
      return flag;
    });
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

  /**
   * Add/remove mods from active effects.
   *
   * @param {*} event
   */
  _activeEffectToggle(event) {
    LOGGER.trace("_activeEffectToggle | CPRRollDialog | Called.");
    const changeKey = SystemUtils.GetEventDatum(event, "name");
    const value = parseInt(SystemUtils.GetEventDatum(event, "data-value"), 10);
    const source = SystemUtils.GetEventDatum(event, "data-source");
    const id = `${changeKey}-${SystemUtils.GetEventDatum(event, "data-mod-id")}`;

    if (this.rollData.mods.some((m) => m.id === id)) {
      this.rollData.removeMod(id);
    } else {
      this.rollData.addMod({ value, source, id });
    }

    this.render();
  }
}

export class CPRRoleRollDialog extends CPRRollDialog {
  /**
   * Prepares any data unique to the Role Roll Dialog sheet.
   */
  getData() {
    LOGGER.trace("getData | CPRRoleRollDialog | called.");
    const data = super.getData();

    const skillIsVarying = this.item.system.skill === "varying"
      || this.item.system.abilities.find((a) => a.name === this.rollData.roleName)?.skill === "varying";

    if (skillIsVarying) {
      data.isVarying = true;
      if (this.rollData.skillName === "varying") {
        data.rollData.skillName = this.rollData.skillList.sort((a, b) => (a.name > b.name ? 1 : -1))[0].name;
      }
    }

    return data;
  }

  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRRollRoleDialog | Called.");
    super.activateListeners(html);
    html.find(".skill-list-select").change((event) => this._updateSkillValue(event));
  }

  /**
   * Updates the skill value when the varied skill is changed.
   *
   * @param {*} event
   */
  _updateSkillValue(event) {
    LOGGER.trace("_updateSkillValue | CPRRoleRollDialog | called.");
    const skill = this.rollData.skillList.find((s) => s.name === event.currentTarget.value);
    this.rollData.skillValue = skill.system.level;
  }

  /**
   * Updates the skill value when the varied skill is changed.
   *
   * @param {*} options
   * @param {Object} formData - Updated dialog data to be merged with the original object.
   */
  _updateObject(event, formData) {
    LOGGER.trace("_updateObject | CPRRoleRollDialog | called.");
    const fd = duplicate(formData);
    if (formData.dummySkillValue) {
      fd.skillValue = formData.dummySkillValue;
    }

    super._updateObject(event, fd);
  }
}
