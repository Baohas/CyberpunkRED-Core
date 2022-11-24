/* eslint-disable max-classes-per-file */
/* global */
import CPRMod from "../rolls/cpr-modifiers.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import CPRDialog from "./cpr-dialog-application.js";
import CPR from "../system/config.js";

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
    const allSituationalMods = CPRMod.getAllModifiers(effects).filter((m) => m.isSituational);
    let filteredMods = [];

    // Stat Effects. (This should either not be included or refactored, since the bonus is already applied via the native active effects.)
    if ((this.prototypeChain.includes("CPRStatRoll") || this.prototypeChain.includes("CPRRoleRoll")) && !this.prototypeChain.includes("CPRInterfaceRoll")) {
      const statMods = allSituationalMods.filter((m) => m.key === `system.stats.${this.rollData.statName.toLowerCase()}.value`);
      filteredMods = filteredMods.concat(statMods);
    }

    // Skill Effects.
    if ((this.prototypeChain.includes("CPRSkillRoll") || this.prototypeChain.includes("CPRRoleRoll")) && !this.prototypeChain.includes("CPRInterfaceRoll")) {
      const skillMods = allSituationalMods.filter((m) => m.key === `bonuses.${SystemUtils.slugify(this.rollData.skillName)}`);
      filteredMods = filteredMods.concat(skillMods);
    }

    if (this.prototypeChain.includes("CPRInitiative")) {
      const initiativeMods = allSituationalMods.filter((m) => m.key === `bonuses.initiative`);
      filteredMods = filteredMods.concat(initiativeMods);
    }

    if (this.prototypeChain.includes("CPRAttackRoll") && !this.prototypeChain.includes("CPRProgramAttackRoll")) {
      const attackRollBonusKeys = ["bonuses.universalAttack"];

      if (this.item.type === "cyberdeck") {
        attackRollBonusKeys.push("bonuses.zap");
      } else {
        if (this.item.system.isRanged) {
          attackRollBonusKeys.push("bonuses.ranged");
        } else {
          attackRollBonusKeys.push("bonuses.melee");
        }

        if (this.prototypeChain[0] === "CPRAttackRoll") {
          attackRollBonusKeys.push("bonuses.singleShot");
        } else if (this.prototypeChain.includes("CPRAimedAttackRoll")) {
          attackRollBonusKeys.push("bonuses.singleShot");
          attackRollBonusKeys.push("bonuses.aimedShot");
        } else if (this.prototypeChain.includes("CPRAutofireRoll")) {
          attackRollBonusKeys.push("bonuses.autofire");
        } else if (this.prototypeChain.includes("CPRSuppressiveFireRoll")) {
          attackRollBonusKeys.push("bonuses.suppressive");
        }

        const upgradeMods = this.item.getAllUpgradeMods("attackmod").filter((m) => m.isSituational);
        filteredMods.concat(upgradeMods);
      }

      const attackMods = allSituationalMods.filter((m) => attackRollBonusKeys.includes(m.key));
      filteredMods = filteredMods.concat(attackMods);
    }

    if (this.prototypeChain.includes("CPRDamageRoll") && !this.prototypeChain.includes("CPRProgramDamageRoll")) {
      const damageMods = allSituationalMods.filter((m) => m.key === `bonuses.universalDamage`);
      const upgradeMods = this.item.getAllUpgradeMods("damage").filter((m) => m.isSituational);
      filteredMods = filteredMods.concat(damageMods).concat(upgradeMods);
    }

    // Role Effects.
    if (this.prototypeChain.includes("CPRRoleRoll")) {
      const roleMods = allSituationalMods.filter((m) => m.key === `bonuses.${SystemUtils.slugify(this.rollData.roleName)}`);
      filteredMods = filteredMods.concat(roleMods);
    }

    // Netrunner Effects.
    if (this.prototypeChain.includes("CPRInterfaceRoll")) {
      const netrunnerRollBonusKeys = Object.keys(CPR.activeEffectKeys.netrun).filter((k) => k !== "bonuses.brainDamageReduction");
      const netrunnerMods = allSituationalMods.filter((m) => netrunnerRollBonusKeys.includes(m.key));
      filteredMods = filteredMods.concat(netrunnerMods);
    }

    if (this.prototypeChain.includes("CPRDeathSaveRoll")) {
      const deathSavePenaltyMods = allSituationalMods.filter((m) => m.key === "bonuses.deathSavePenalty");
      filteredMods = filteredMods.concat(deathSavePenaltyMods);
    }

    data.filteredMods = filteredMods;
    this.filteredMods = filteredMods;
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
   * someone can figure out how to resolve the Promise after the form is submitted.)
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
    const id = SystemUtils.GetEventDatum(event, "data-mod-id");
    const mod = this.filteredMods.find((m) => m.id === id);

    if (this.rollData.mods.some((m) => m.id === id)) {
      this.rollData.removeMod(id);
    } else {
      this.rollData.addMod([mod]);
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
      data.isVarying = true; // Used as a condition to display drop-down menu in dialog.
      if (this.rollData.skillName === "varying") {
        // If the skill is varying, assign data from the first skill in the dropdown menu, so all form data are consistent with the dropdown menu.
        // Note, this will only happen when the dialog is first opened, which is by design.
        const firstSkill = this.rollData.skillList.sort((a, b) => (a.name > b.name ? 1 : -1))[0];
        data.rollData.skillName = firstSkill.name;
        data.rollData.skillValue = firstSkill.system.level;
        data.rollData.statName = firstSkill.system.stat;
        data.rollData.statValue = this.actor.getStat(this.rollData.statName);
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
   * Updates the skill value when the varied skill is changed. Also adds/removes the modifier for each skill
   * as it is changed.
   *
   * @param {*} event
   */
  _updateSkillValue(event) {
    LOGGER.trace("_updateSkillValue | CPRRoleRollDialog | called.");
    const skill = this.rollData.skillList.find((s) => s.name === event.currentTarget.value);

    // Set skill level.
    this.rollData.skillValue = skill.system.level;

    // Set stat level.
    this.rollData.statName = skill.system.stat;
    this.rollData.statValue = this.actor.getStat(this.rollData.statName);

    const effects = this.actor.effects.contents;
    const allMods = CPRMod.getAllModifiers(effects);
    const newSkillMods = CPRMod.getRelevantMods(allMods, SystemUtils.slugify(event.currentTarget.value), "AeBonus"); // Mods for the skill we are changing to.
    const previousSkillMods = CPRMod.getRelevantMods(allMods, SystemUtils.slugify(this.rollData.skillName), "AeBonus"); // Mods for the skill we are changing away from.

    // Apply mods appropriately for the newly selected skill.
    if (newSkillMods) {
      newSkillMods.forEach((m) => {
        if (!m.isSituational) {
          this.rollData.addMod([m]);
        } else if (m.isSituational && m.onByDefault) {
          this.rollData.addMod([m]);
          this.filteredMods.push(m);
        } else {
          this.filteredMods.push(m);
        }
      });
    }

    // Remove mods appropriately for the deselected skill.
    if (previousSkillMods) {
      previousSkillMods.forEach((previousMod) => {
        if (this.rollData.mods.some((currentMod) => previousMod.id === currentMod.id)) {
          this.rollData.removeMod(previousMod.id);
        }

        if (this.filteredMods.some((currentMod) => previousMod.id === currentMod.id)) {
          const modIndex = this.filteredMods.findIndex((currentMod) => previousMod.id === currentMod.id);
          this.filteredMods.splice(modIndex, 1);
        }
      });
    }
  }
}
