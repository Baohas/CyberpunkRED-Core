/* eslint-disable no-await-in-loop */
import CPR from "../system/config.js";
import CPRChat from "../chat/cpr-chat.js";
import * as CPRRolls from "../rolls/cpr-rolls.js";
import Rules from "../utils/cpr-rules.js";
import CPRActorUtils from "../utils/ActorUtils.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import TextUtils from "../utils/TextUtils.js";
import CPRMod from "../rolls/cpr-modifiers.js";
import { cprConfirm, cprFormPrompt } from "../dialog/cpr-dialog.js";
import CPRActor from "./cpr-actor.js";
import CPRCharacterActorSheet from "./sheet/cpr-character-sheet.js";
import CPRMookActorSheet from "./sheet/cpr-mook-sheet.js";

/**
 * Shape a stat/derived-stat field for a roll formula: a single-value field becomes a plain number, a
 * value+max field (LUCK, EMP, HP, Humanity, …) becomes `{ value, total }` so both `@stats.luck.value`
 * (current) and `@stats.luck.total` (max) resolve. Non-numeric fields (e.g. currentWoundState) are
 * skipped (undefined).
 *
 * @param {*} field - the stat field
 * @returns {number|{value:number,total:number}|undefined}
 */
function refStat(field) {
  if (typeof field === "number") return field;
  if (!field || typeof field !== "object") return undefined;
  return refStatObject(field);
}

/**
 * Shape an object-valued stat field: a `{value, max}` pair → `{value, total}`, a `{value}` → its
 * number, otherwise undefined.
 *
 * @param {object} field - the object stat field
 * @returns {number|{value:number,total:number}|undefined}
 */
function refStatObject(field) {
  if (typeof field.max === "number")
    return { value: field.value, total: field.max };
  if (typeof field.value === "number") return field.value;
  return undefined;
}

/**
 * CPRHuman holds the STAT/skill/health/roll behaviour shared by player Characters and Mooks (NPCs).
 *
 * @extends {CPRActor}
 */
export default class CPRHuman extends CPRActor {
  /**
   * Populate a newly-created actor with its core skills and core cyberware.
   *
   * This runs in the document-creation pipeline (`_preCreate`) rather than a `static create()`
   * override, so population happens on *every* creation path — the sidebar create dialog,
   * `Actor.create`, `createDocuments`, and programmatic/API creation alike (the old override only ran
   * for `ClassName.create()` calls). Core items are injected into the creation source with
   * `updateSource`, and the core cyberware is marked installed in the same pass (item ids are assigned
   * here so no post-create update is needed). A duplicate or compendium import already carries its own
   * `items`, so it is left untouched; `options.cprSkipDefaults` opts out explicitly.
   *
   * @async
   * @override
   * @param {object} data - the creation data
   * @param {object} options - creation options; `cprSkipDefaults` skips core-item population
   * @param {User} user - the user requesting the creation
   * @returns {Promise<boolean|void>} false aborts creation
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    // Only a genuinely-new actor is populated: a duplicate/import brings its own items, and callers
    // can opt out explicitly.
    if (this._shouldPopulateCoreItems(data, options))
      await this._populateCoreItems();
    return allowed;
  }

  /**
   * Whether a newly-created actor should be populated with core skills/cyberware.
   *
   * @param {object} data - the creation data
   * @param {object} options - creation options; `cprSkipDefaults` opts out
   * @returns {boolean}
   */
  _shouldPopulateCoreItems(data, options) {
    return !options.cprSkipDefaults && !data.items?.length;
  }

  /**
   * Inject the core skills and cyberware into the creation source, marking the cyberware installed.
   *
   * @returns {Promise<void>}
   */
  async _populateCoreItems() {
    const items = await this._buildCoreItems();
    const installedItems = items
      .filter((item) => item.type === "cyberware")
      .map((item) => item._id);
    this.updateSource({
      items,
      "system.installedItems.list": installedItems,
    });
  }

  /**
   * Build the core-item creation data (skills + cyberware) for a new actor.
   *
   * @returns {Promise<Array<object>>}
   */
  async _buildCoreItems() {
    const coreItems = [
      ...(await SystemUtils.GetCoreSkills()),
      ...(await SystemUtils.GetCoreCyberware()),
    ];
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    return coreItems.map((item) => this._toCoreItemData(item, containerTypes));
  }

  /**
   * Convert a source core item into fresh creation data, giving container-type items install slots.
   *
   * @param {CPRItem} item - the source core item
   * @param {string[]} containerTypes - item types that carry the container mixin
   * @returns {object} the creation data for the item
   */
  _toCoreItemData(item, containerTypes) {
    const system = foundry.utils.duplicate(item.system);
    if (containerTypes.includes(item.type)) {
      system.installedItems.slots = 7;
      system.installedItems.allowedTypes = ["itemUpgrade", "cyberware"];
    }
    return {
      _id: foundry.utils.randomID(),
      name: item.name,
      img: item.img,
      type: item.type,
      system,
    };
  }

  /**
   * Called when an actor is passed to the client, we override this to calculate
   * derived stats and massage some of the data for convenience later.
   *
   * @override
   */
  prepareData() {
    super.prepareData();
    // prepareData() runs for every actor the client knows about, but only the owner (or the GM)
    // should compute derived stats, and never for a compendium-resident actor.
    if (this._shouldCalculateDerivedStats()) this._calculateDerivedStats();
  }

  /**
   * Whether this client should compute derived stats for this actor: it must be a world actor (not
   * compendium-resident) and owned by this user (or this user is the GM).
   *
   * @returns {boolean}
   */
  _shouldCalculateDerivedStats() {
    const inCompendium =
      this.compendium !== null && this.compendium !== undefined;
    return !inCompendium && (this.isOwner || game.user.isGM);
  }

  /**
   * Also called when an actor is passed to the client. Notably this is called BEFORE active
   * effects are applied to the actor, so we can prepare temporary variables for them to modify.
   * We get the list of skills for the actor, including custom, and creates a "bonus" object
   * in the actor data that active effects will later modify. When a skill roll is made, it will
   * use the bonus object to consider skill mods from active effects on the actor.
   *
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();
    this.bonuses = {};
    const skills = this.items.filter((i) => i.type === "skill");
    skills.forEach((skill) => {
      this.bonuses[SystemUtils.slugify(skill.name)] = 0;
    });
    const roles = this.items.filter((i) => i.type === "role");
    roles.forEach((role) => {
      this.bonuses[SystemUtils.slugify(role.system.mainRoleAbility)] = 0;
      if (role.system.abilities.length > 0) {
        for (const ability of role.system.abilities) {
          this.bonuses[SystemUtils.slugify(ability.name)] = 0;
        }
      }
    });
    this.bonuses.run = 0;
    this.bonuses.walk = 0;
    this.bonuses.deathSavePenalty = 0;
    this.bonuses.hands = 0;
    this.bonuses.initiative = 0;
    this.bonuses.maxHp = 0;
    this.bonuses.maxHumanity = 0;
    this.bonuses.universalAttack = 0;
    this.bonuses.universalDamage = 0;
    this.bonuses.universalDamageReduction = 0;
    this.bonuses.hasPainSuppression = 0;
    // netrunning things
    this.bonuses.speed = 0;
    this.bonuses.perception_net = 0; // beware of hacks because "perception" is also a skill
    this.bonuses.attack = 0;
    this.bonuses.defense = 0;
    this.bonuses.rez = 0;
    this.bonuses.brainDamageReduction = 0;
    // combat-related rolls
    this.bonuses.aimedShot = 0;
    this.bonuses.melee = 0;
    this.bonuses.ranged = 0;
    this.bonuses.autofire = 0;
    this.bonuses.suppressive = 0;
    this.bonuses.singleShot = 0;
    // Miscellaneous bonuses.
    this.bonuses.allActions = 0;
  }

  /**
   * This is where derived stats are calculated, Note, one can tailor the behavior
   * depending on which sheet (aka "app") is associated with the actor.
   *
   * TODO: this is called 3 times when creating an actor... why?
   *
   * @private
   */
  _calculateDerivedStats() {
    const cprData = this.system;
    // `stats` now holds both the base STATs and the folded-in derived stats; keep the
    // local name `derivedStats` (an alias) to minimise churn in the calculations below.
    const derivedStats = cprData.stats;

    // Walk & Run, from the Move/Run Action (pg 127)
    derivedStats.walk.value = cprData.stats.move.value * 2;
    derivedStats.run.value = cprData.stats.move.value * 4;

    // seriously wounded
    derivedStats.seriouslyWounded = Math.ceil(derivedStats.hp.max / 2);

    // Death save
    let basePenalty = 0; // 0 + active effects
    const critInjury = this.itemTypes.criticalInjury;
    critInjury.forEach((criticalInjury) => {
      const { deathSaveIncrease } = criticalInjury.system;
      if (deathSaveIncrease) {
        basePenalty += 1;
      }
    });
    derivedStats.deathSave.basePenalty = basePenalty;
    derivedStats.deathSave.value =
      derivedStats.deathSave.penalty + derivedStats.deathSave.basePenalty;

    // Make sure current HP is never higher than max HP.
    derivedStats.hp.value = Math.min(
      derivedStats.hp.value,
      derivedStats.hp.max,
    );

    // Make sure current Humanity is never higher than max Humanity.
    derivedStats.humanity.value = Math.min(
      derivedStats.humanity.value,
      derivedStats.humanity.max,
    );

    // We need to always call this because if the actor was wounded and now is not, their
    // value would be equal to max, however their current wound state was never updated.
    this._setWoundState();
    // Updated derivedStats variable with currentWoundState
    derivedStats.currentWoundState = this.system.stats.currentWoundState;
  }

  /**
   * Returns the current wound state of the actor
   *
   * @returns {String}
   */
  getWoundState() {
    return this.system.stats.currentWoundState;
  }

  /**
   * Sets the wound state of the actor based on the current hit point value
   *
   * @private
   */
  _setWoundState() {
    this.system.stats.currentWoundState = this._computeWoundState();
  }

  /**
   * Derive the wound-state label from current HP.
   *
   * @returns {String} one of mortallyWounded/seriouslyWounded/lightlyWounded/notWounded/invalidState
   */
  _computeWoundState() {
    const { hp } = this.system.stats;
    if (hp.value >= hp.max)
      return hp.value === hp.max ? "notWounded" : "invalidState";
    return this._computeWoundedState();
  }

  /**
   * Derive the wounded label for an actor below max HP.
   *
   * @returns {String} mortallyWounded/seriouslyWounded/lightlyWounded
   */
  _computeWoundedState() {
    const { hp, seriouslyWounded } = this.system.stats;
    if (hp.value < 1) return "mortallyWounded";
    if (hp.value < seriouslyWounded) return "seriouslyWounded";
    return "lightlyWounded";
  }

  /**
   * Looks up the wound state and returns the penalties (-2, -4) that should be applied to rolls
   *
   * @returns {Number}
   */
  getWoundStateMods() {
    let woundStateMod = 0;
    if (
      this.getWoundState() === "seriouslyWounded" &&
      this.bonuses.hasPainSuppression <= 0
    ) {
      woundStateMod = -2;
    }
    if (this.getWoundState() === "mortallyWounded") {
      woundStateMod = -4;
    }
    return woundStateMod;
  }

  /**
   * Method to install cyberware owned by an actor.
   * This will handle making sure it is going into the right foundational cyberware, if applicable.
   * Additionally, if there is optional cyberware installed under a foundational cyberware which
   * allows cyberware to be installed into it (ie Chipware Socket) and it has capacity, it will
   * also be listed as an installation target.
   *
   * @async
   * @param {String} itemId - the ItemId of the cyberware to be added
   * @returns {Boolean} - Whether the installation was successful or not
   */
  async installCyberware(itemId) {
    const item = this.getOwnedItem(itemId);
    const baseCompatible = this.itemTypes.cyberware.filter((cw) =>
      this._isCompatibleFoundational(cw, item),
    );
    if (this._lacksFoundationalTarget(baseCompatible, item))
      return this._warnNoFoundational();

    // All other cyberware installed in this one.
    const installedCyberware = item
      .recursiveGetAllInstalledItems()
      .filter((i) => i.type === "cyberware");

    const formData = await this._promptCyberwareInstall(
      item,
      baseCompatible,
      installedCyberware,
    );
    if (!formData) return false;
    if (this._missingFoundationalSelection(item, formData))
      return this._warnNoFoundational();

    return this._performCyberwareInstall(item, installedCyberware, formData);
  }

  /** Whether `cw` is an installed foundational piece of the same type as `item`. */
  _isCompatibleFoundational(cw, item) {
    return (
      cw.system.isInstalled &&
      cw.system.isFoundational &&
      cw.system.type === item.system.type
    );
  }

  /** Non-foundational cyberware with no compatible foundational target cannot be installed. */
  _lacksFoundationalTarget(baseCompatible, item) {
    return baseCompatible.length < 1 && !item.system.isFoundational;
  }

  /** After the dialog, a non-foundational piece must have had a foundational target chosen. */
  _missingFoundationalSelection(item, formData) {
    return !item.system.isFoundational && !formData.foundationalId;
  }

  /** Warn that there is no foundational cyberware of the correct type and fail the install. */
  _warnNoFoundational() {
    Rules.lawyer(
      false,
      "CPR.messages.warnNoFoundationalCyberwareOfCorrectType",
    );
    return false;
  }

  /**
   * Show the "Install Cyberware" dialog and return its form data.
   *
   * @param {CPRItem} item - the cyberware being installed
   * @param {CPRItem[]} baseCompatible - the compatible installed foundational cyberware
   * @param {CPRItem[]} installedCyberware - cyberware already installed inside `item`
   * @returns {Promise<object|false>} the form data, or false if cancelled
   */
  async _promptCyberwareInstall(item, baseCompatible, installedCyberware) {
    const compatibleTargetCyberware = this._collectCompatibleTargets(
      baseCompatible,
      item,
    );
    const humanityLossSelectOptions = this._buildHumanityLossOptions(
      item,
      installedCyberware,
    );
    return cprFormPrompt({
      data: {
        item,
        foundationalCyberware: compatibleTargetCyberware,
        // Empty when the cyberware being installed is itself foundational, hence the optional chaining.
        foundationalId: compatibleTargetCyberware[0]?._id,
        humanityLossType: "rolled",
        humanityLossSelectOptions,
      },
      title: SystemUtils.Localize("CPR.dialog.installCyberware.title"),
      template: `systems/${game.system.id}/templates/dialog/cpr-install-cyberware-prompt.hbs`,
    });
  }

  /**
   * Gather every valid install target: each compatible foundational cyberware plus, recursively, any
   * container cyberware installed within it that can accept `item`.
   *
   * @param {CPRItem[]} baseCompatible - the compatible installed foundational cyberware
   * @param {CPRItem} item - the cyberware being installed
   * @returns {CPRItem[]} the install targets
   */
  _collectCompatibleTargets(baseCompatible, item) {
    const targets = [];
    const containerTypes = SystemUtils.getDocTypesFromMixin("container");
    for (const cyberware of baseCompatible) {
      targets.push(cyberware);
      this._collectNestedTargets(cyberware, item, containerTypes, targets);
    }
    return targets;
  }

  /** Walk a foundational piece's install tree, collecting container cyberware that can accept `item`. */
  _collectNestedTargets(cyberware, item, containerTypes, targets) {
    let idList = cyberware.system.installedItems.list;
    while (idList.length > 0) {
      idList = this._collectTargetsFromLayer(
        idList,
        item,
        containerTypes,
        targets,
      );
    }
  }

  /** Process one layer of installed ids, pushing valid targets and returning the next layer's ids. */
  _collectTargetsFromLayer(idList, item, containerTypes, targets) {
    let next = [];
    for (const id of idList) {
      const itemLookup = this.getOwnedItem(id);
      // eslint-disable-next-line no-continue
      if (!containerTypes.includes(itemLookup.type)) continue;
      if (this._canInstallInto(itemLookup, item)) targets.push(itemLookup);
      next = next.concat(itemLookup.system.installedItems.list);
    }
    return next;
  }

  /** Whether `container` cyberware allows `item`'s type and has a free slot for it. */
  _canInstallInto(container, item) {
    return (
      container.system.installedItems.allowed &&
      container.system.installedItems.allowedTypes.includes(item.type) &&
      container.availableInstallSlots() >= item.system.size
    );
  }

  /**
   * Build the Humanity-Loss select options (rolled/static formulae + none) for the install dialog.
   *
   * @param {CPRItem} item - the cyberware being installed
   * @param {CPRItem[]} installedCyberware - cyberware already installed inside `item`
   * @returns {object} the select options
   */
  _buildHumanityLossOptions(item, installedCyberware) {
    const rolledHumanityLoss = installedCyberware.reduce(
      (accumulator, i) => `${accumulator} + ${i.system.humanityLoss.roll}`,
      item.system.humanityLoss.roll,
    );
    const staticHumanityLoss = installedCyberware.reduce(
      (accumulator, i) => accumulator + i.system.humanityLoss.static,
      item.system.humanityLoss.static,
    );
    return {
      roll: SystemUtils.Format("CPR.dialog.installCyberware.roll", {
        loss: rolledHumanityLoss,
      }),
      static: SystemUtils.Format("CPR.dialog.installCyberware.static", {
        loss: staticHumanityLoss,
      }),
      none: SystemUtils.Localize("CPR.dialog.installCyberware.none"),
    };
  }

  /**
   * Install `item` into the chosen target (self if foundational, else the selected foundational) and
   * apply the resulting Humanity Loss on success.
   *
   * @param {CPRItem} item - the cyberware being installed
   * @param {CPRItem[]} installedCyberware - cyberware already installed inside `item`
   * @param {object} formData - the install-dialog form data
   * @returns {Promise<boolean>} whether the install succeeded
   */
  async _performCyberwareInstall(item, installedCyberware, formData) {
    const target = item.system.isFoundational
      ? this
      : this.getOwnedItem(formData.foundationalId);
    const installationSuccess = await target.installItems([item]);
    if (installationSuccess)
      await this.loseHumanityValue(
        [item].concat(installedCyberware),
        formData.humanityLossType,
      );
    return installationSuccess;
  }

  /**
   * Remove (uninstall) Cyberware from an actor. Like installCyberware, this is the top-level entry method.
   *
   * @async
   * @param {String} itemId - the Cyberware item ID to uninstall
   * @param {String} foundationalId - the foundational Cyberware Id to uninstall from
   * @param {Boolean} skipConfirm - a boolean to indicate whether the confirmation dialog should be displayed
   * @returns {Promise} - Returns the promise from calling this.update()
   */
  async uninstallCyberware(itemId, foundationalId, skipConfirm = false) {
    const item = this.getOwnedItem(itemId);
    let confirmRemove;
    if (!skipConfirm) {
      const dialogTitle = SystemUtils.Localize(
        "CPR.dialog.uninstallCyberware.title",
      );
      const dialogMessage = SystemUtils.Format(
        "CPR.dialog.uninstallCyberware.text",
        { item: item.name },
      );

      // Show confirmation dialog.
      confirmRemove = await cprConfirm(dialogMessage, { title: dialogTitle });
    } else {
      confirmRemove = true;
    }

    if (confirmRemove) {
      const target =
        this.id === item.system.installedIn[0]
          ? this
          : this.getOwnedItem(item.system.installedIn[0]);
      await target.uninstallItems([item]);
    }
    return this.setMaxHumanity();
  }

  /**
   * Return the skill level (number) for a given skill on the actor.
   *
   * @param {String} skillName - the skill name (e.g. from CPR.skillList) to look up
   * @returns {Number} - skill level or 0 if not found
   */
  getSkillLevel(skillName) {
    const skillList = this.itemTypes.skill.filter((s) => s.name === skillName);
    if (skillList.length > 0) {
      const relevantSkill = skillList[0];
      return parseInt(relevantSkill.system.level, 10);
    }
    return 0;
  }

  /**
   * After a death save is rolled, process the results: assess pass/fail, and persist data to the actor
   * model. Remember when a save is passed, the next one gets harder.
   *
   * @param {CPRRoll} cprRoll - the rolled death save object
   * @returns {String}
   */
  processDeathSave(cprRoll) {
    const success = SystemUtils.Localize("CPR.rolls.success");
    const failed = SystemUtils.Localize("CPR.rolls.failed");
    let saveResult =
      cprRoll.resultTotal < this.system.stats.body.value ? success : failed;
    if (cprRoll.initialRoll === 10) {
      saveResult = failed;
    }
    if (saveResult === success) {
      const deathPenalty = this.system.stats.deathSave.penalty + 1;
      this.update({ "system.stats.deathSave.penalty": deathPenalty });
    }
    return saveResult;
  }

  /**
   * Method to manually increase the death save penalty by 1.
   * Can be used in case a character gets hit by an attack while mortally wounded.
   */
  increaseDeathPenalty() {
    const deathPenalty = this.system.stats.deathSave.penalty + 1;
    this.update({ "system.stats.deathSave.penalty": deathPenalty });
  }

  /**
   * Whenever a death save passes, the penalty increases by 1. Once a character is stable,
   * the penalty should be reset to 0, which is what this method does.
   */
  resetDeathPenalty() {
    this.update({ "system.stats.deathSave.penalty": 0 });
  }

  /**
   * Given a stat name, return the value of it off the actor
   *
   * @param {String} statName - name (from CPR.statList) of the stat to retrieve
   * @returns {Number}
   */
  getStat(statName) {
    return parseInt(this.system.stats[statName].value, 10);
  }

  /**
   * Expose actor data for `@`-references in roll formulas (chat `/r`, weapon damage, macros).
   *
   * Single-value stats are exposed as plain numbers (`@stats.ref`); stats with a current/max pair —
   * LUCK, EMP, and derived stats like HP and Humanity — are exposed as `{ value, total }`, so a formula
   * can use `@stats.luck.value` (current) or `@stats.luck.total` (max). Skills come from the
   * `system.skills` getter as `level + Active Effect mods` (`@skills.handgun`). Singular aliases
   * `@stat`/`@skill` mirror the plural keys.
   *
   * @override
   * @returns {Object}
   */
  getRollData() {
    const data = { ...super.getRollData() };

    const buildRefs = (source) => {
      const out = {};
      for (const [name, field] of Object.entries(source ?? {})) {
        const ref = refStat(field);
        if (ref !== undefined) out[name] = ref;
      }
      return out;
    };

    // `system.stats` now holds both the base STATs and the folded-in derived stats.
    const stats = buildRefs(this.system.stats);

    // Skills come from the `system.skills` getter (slugified keys, level + Active Effect mods) so an
    // AE-modified skill resolves to its effective level — `@skills.handgun` is `level + mods`.
    const skills = {};
    for (const [slug, skill] of Object.entries(this.system.skills ?? {})) {
      skills[slug] = skill.level + skill.mods;
    }

    data.stats = { ...stats };
    data.skills = skills;
    data.stat = data.stats;
    data.skill = skills;
    return data;
  }

  /**
   * Get all mods provided by equippable and upgradable items for a specific thing
   *
   * @param {String} baseName - name of the thing (e.g. stat) getting mods
   * @returns {Number}
   */
  getUpgradeMods(baseName) {
    // Items that both equip and upgrade can modify our stat base while equipped and upgraded.
    const equippableItemTypes = SystemUtils.getDocTypesFromMixin("equippable");
    const upgradableItemTypes = SystemUtils.getDocTypesFromMixin("upgradable");
    const itemTypes = equippableItemTypes.filter((value) =>
      upgradableItemTypes.includes(value),
    );

    let acc = { modValue: 0, modType: "modifier" };
    for (const itemType of itemTypes) {
      const itemList = this.itemTypes[itemType].filter(
        (i) => i.system.equipped === "equipped" && i.system.isUpgraded,
      );
      for (const i of itemList) {
        acc = this._applyUpgradeMod(acc, i.getTotalUpgradeValues(baseName));
      }
    }
    return acc.modValue;
  }

  /**
   * Fold one item's upgrade contribution into the running `{ modValue, modType }` accumulator.
   * Override upgrades take the highest override value; modifier upgrades add up.
   *
   * @param {{modValue:number, modType:string}} acc - the running accumulator
   * @param {{type:string, value:number}} upgradeData - this item's upgrade values for the stat
   * @returns {{modValue:number, modType:string}} the updated accumulator
   */
  _applyUpgradeMod(acc, upgradeData) {
    if (acc.modType === "override")
      return this._applyOverrideMod(acc, upgradeData);
    const modValue =
      upgradeData.type === "override"
        ? upgradeData.value
        : acc.modValue + upgradeData.value;
    return { modValue, modType: upgradeData.type };
  }

  /**
   * Once in override mode, only a larger override value replaces the current one.
   *
   * @param {{modValue:number, modType:string}} acc - the running accumulator
   * @param {{type:string, value:number}} upgradeData - this item's upgrade values for the stat
   * @returns {{modValue:number, modType:string}} the updated accumulator
   */
  _applyOverrideMod(acc, upgradeData) {
    if (upgradeData.type === "override" && upgradeData.value > acc.modValue)
      return { modValue: upgradeData.value, modType: acc.modType };
    return acc;
  }

  /**
   * Given a stat, look up any armor penalties applied to it and return that number.
   *
   * @param {String} stat - name of a stat we are interested in seeing the mods on
   * @returns {Number}
   */
  getArmorPenaltyMods(stat) {
    const penaltyStats = ["ref", "dex", "move"];
    const penaltyMods = [0];
    if (penaltyStats.includes(stat)) {
      const coverage = ["head", "body"];
      coverage.forEach((location) => {
        const penaltyValue = Number(this._getArmorValue("penalty", location));
        if (penaltyValue > 0) {
          penaltyMods.push(0 - penaltyValue);
        }
      });
    }
    return Math.min(...penaltyMods);
  }

  /**
   * Get the actors current armor value (or stat penalty) given a location.
   *
   * @private
   * @param {String} valueType - indicate whether to get the SP or stat penalty instead
   * @param {string} location - armor location to consider (head or body)
   * @returns {Number}
   */
  _getArmorValue(valueType, location) {
    const armors = this.getEquippedArmors(location);
    const sps = this._armorLocationSPs(armors, location);
    // Armor penalties may be stored negative or positive (DataModel limitation); use the magnitude.
    const penalties = armors.map((a) => Math.abs(a.system.penalty));

    // Force a 0 so nothing-equipped yields 0.
    penalties.push(0);
    sps.push(0);

    if (valueType === "sp") return Math.max(...sps);
    if (valueType === "penalty") return Math.max(...penalties);
    return 0;
  }

  /**
   * The SP values of the equipped armors for a head/body location. (getEquippedArmors throws on a bad
   * location before this is reached.)
   *
   * @param {CPRItem[]} armors - the equipped armors for the location
   * @param {String} location - "body" or "head"
   * @returns {number[]}
   */
  _armorLocationSPs(armors, location) {
    if (location === "body") return armors.map((a) => a.system.bodyLocation.sp);
    if (location === "head") return armors.map((a) => a.system.headLocation.sp);
    return [];
  }

  /**
   * Return an array of all equipped armors given a location. Yes, it is possible and within the rules
   * to wear multiple armors, even thought it might not be a good idea.
   *
   * @param {String} location - head, body, or shield
   * @returns {Array}
   */
  getEquippedArmors(location) {
    const armors = this.itemTypes.armor;
    const equipped = armors.filter(
      (item) => item.system.equipped === "equipped",
    );

    if (location === "body") {
      return equipped.filter((item) => item.system.isBodyLocation);
    }
    if (location === "head") {
      return equipped.filter((item) => item.system.isHeadLocation);
    }
    if (location === "shield") {
      return equipped.filter((item) => item.system.isShield);
    }
    throw new Error(`Bad location given: ${location}`);
  }

  /**
   * Updates tracked armor values based on the given location and item ID
   *
   * @param {string} location - Armor location (e.g., "shield", "head", "body")
   * @param {string|null} id - The ID of the item, default is null
   * @returns {Promise<boolean>} - Returns true if successful, false otherwise
   */
  async updateTrackedArmor(location, id = null) {
    const targetArmor = this.getOwnedItem(id);
    const armorLocation = TextUtils.toTitleCase(location);
    const currentArmor =
      this.system.externalData[`currentArmor${armorLocation}`];
    const armorPath = "system.externalData.currentArmor";
    const update = { value: 0, max: 0 };

    // Get the values of the armor
    Object.assign(
      update,
      this._calculateArmorUpdate(targetArmor, location, `${location}Location`),
    );

    // Update the id of the tracked armor if it doesn't match
    if (currentArmor.id !== id) {
      await this.update({ [`${armorPath}${armorLocation}.id`]: id });
    }

    // Update armor values
    await this.update({
      [`${armorPath}${armorLocation}.value`]: update.value,
      [`${armorPath}${armorLocation}.max`]: update.max,
    });

    return true;
  }

  /**
   * The `{ value, max }` to write for a tracked-armor location: defaults when there is no target
   * armor, the shield's hit points for a shield, else the location's `sp - ablation` / `sp`.
   *
   * @param {CPRItem|undefined} targetArmor - the armor being tracked (or undefined)
   * @param {String} location - "shield", "head", or "body"
   * @param {String} locationKey - the system key for the location (e.g. "bodyLocation")
   * @returns {{value:number, max:number}}
   */
  _calculateArmorUpdate(targetArmor, location, locationKey) {
    if (!targetArmor) return { value: 0, max: 0 };
    if (location === "shield") return this._shieldArmorUpdate(targetArmor);
    return this._locationArmorUpdate(targetArmor, locationKey);
  }

  /** The `{ value, max }` from a shield's hit points. */
  _shieldArmorUpdate(targetArmor) {
    const { value = 0, max = 0 } = targetArmor.system.shieldHitPoints || {};
    return { value, max };
  }

  /** The `{ value: sp - ablation, max: sp }` for a head/body armor location. */
  _locationArmorUpdate(targetArmor, locationKey) {
    const loc = targetArmor.system[locationKey] || {};
    const sp = loc.sp ?? 0;
    const ablation = loc.ablation ?? 0;
    return { value: sp - ablation, max: sp };
  }

  /**
   * Create the appropriate roll object given a type. The type comes from link attributes in handlebars templates.
   *
   * @param {String} type - the type of roll to create
   * @param {String} name - a name for the roll, which is displayed in the roll card
   * @returns {CPRRoll}
   */
  createRoll(type, name) {
    const builders = {
      [CPRRolls.rollTypes.STAT]: () => this._createStatRoll(name),
      [CPRRolls.rollTypes.DEATHSAVE]: () => this._createDeathSaveRoll(),
      [CPRRolls.rollTypes.LUCKROLL]: () => this._createLuckRoll(),
      [CPRRolls.rollTypes.FACEDOWN]: () => this._createFacedownRoll(),
    };
    return builders[type]?.();
  }

  /**
   * Create a stat roll and return the object representing it
   *
   * @private
   * @param {string} statName - name of the stat to generate a roll for
   * @returns {CPRStatRoll}
   */
  _createStatRoll(statName) {
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = this.getStat(statName);
    const cprRoll = CPRRolls.CPRStatRoll.create(niceStatName, statValue);

    // Add relevant mods.
    cprRoll.addMod(CPRMod.getAllActionMods(this));
    cprRoll.addMod([
      {
        value: this.getArmorPenaltyMods(statName),
        source: SystemUtils.Format("CPR.rolls.modifiers.sources.armorPenalty", {
          stat: niceStatName,
        }),
      },
    ]);
    cprRoll.addMod([
      {
        value: this.getWoundStateMods(),
        source: SystemUtils.Localize(
          "CPR.rolls.modifiers.sources.woundStatePenalty",
        ),
      },
    ]);
    return cprRoll;
  }

  /**
   * Create a stat roll and return the object representing it
   *
   * @private
   * @returns {CPRFacedownRoll}
   */
  _createFacedownRoll() {
    const statName = "cool";
    const niceStatName = SystemUtils.Localize(CPR.statList[statName]);
    const statValue = this.getStat(statName);
    const repValue = this.system.reputation.value;
    const cprRoll = CPRRolls.CPRFacedownRoll.create(
      niceStatName,
      statValue,
      repValue,
    );

    cprRoll.addMod(CPRMod.getAllActionMods(this));

    return cprRoll;
  }

  /**
   * Create a death save roll and return the object representing it
   *
   * @private
   * @returns {CPRDeathSaveRoll}
   */
  _createDeathSaveRoll() {
    const deathSavePenalty = this.system.stats.deathSave.penalty;
    const deathSaveBasePenalty = this.system.stats.deathSave.basePenalty;
    const bodyStat = this.system.stats.body.value;
    const cprRoll = CPRRolls.CPRDeathSaveRoll.create(
      deathSavePenalty,
      deathSaveBasePenalty,
      bodyStat,
    );

    const deathSavePenaltyMods = CPRMod.getRelevantMods(
      CPRMod.getActiveMods(this),
      "deathSavePenalty",
    );
    cprRoll.addMod(deathSavePenaltyMods);
    return cprRoll;
  }

  /**
   * Create a homebrew Luck Roll (JonJon's rule) and return the object representing it. The target the
   * d10 must roll under is the LUCK max or current value, per the `homebrewLuckRollVariant` setting.
   *
   * @private
   * @returns {CPRLuckRoll}
   */
  _createLuckRoll() {
    const variant = game.settings.get(
      game.system.id,
      "homebrewLuckRollVariant",
    );
    const luck = this.system.stats.luck;
    const luckTarget = variant === "current" ? luck.value : luck.max;
    return CPRRolls.CPRLuckRoll.create(luckTarget, variant);
  }

  /**
   * Return the all of the roles this actor currently has
   *
   * @public
   * @returns {Object} - array of roles
   */
  getRoles() {
    return this.itemTypes.role;
  }

  /**
   * Return the number of hands the actor has. For now this assumes 2 and considers any
   * active effects that may add more. Characters cannot start with less than 2 hands.
   *
   * @private
   * @returns {Number}
   */
  _getHands() {
    return 2 + this.bonuses.hands;
  }

  /**
   * Return the number of free hands an actor has, based on what is currently equipped (wielded)
   *
   * @private
   * @returns {Number}
   */

  _getFreeHands() {
    const equippedWeapons = this.system.weapons.equipped;
    // Filter out weapons with undefined handsReq (cyberWeapons, itemUpgrade)
    const filteredWeapons = equippedWeapons.filter(
      (w) => w.system && w.system.handsReq !== undefined,
    );
    // Map to just the handsReq values
    const handsRequired = filteredWeapons.map((w) => w.system.handsReq);
    // Calculate the total number of hands required by the equipped weapons
    const totalHandsRequired = handsRequired.reduce((a, b) => a + b, 0);
    // Calculate the number of free hands
    const freeHands = this._getHands() - totalHandsRequired;

    return freeHands;
  }

  /**
   * Helper method to assess whether the actor can hold another weapon. Used to assess whether
   * an item can be equipped.
   *
   * @param {Item} weapon - item proposed to be held
   * @returns {Boolean}
   */
  canHoldWeapon(weapon) {
    const needed = weapon.system.handsReq;
    if (needed > this._getFreeHands()) {
      return false;
    }
    return true;
  }

  /**
   * Return the first equipped cyberdeck found.
   *
   * @returns {CPRItem} or null if none are found/equipped
   */
  getEquippedCyberdeck() {
    const cyberdecks = this.itemTypes.cyberdeck;
    const equipped = cyberdecks.filter(
      (item) => item.system.equipped === "equipped",
    );
    if (equipped) {
      return equipped[0];
    }
    return null;
  }

  /**
   * Apply damage to the actor, respecting any equipped armor and damage modifiers
   * due to the location. In addition ablate the armor in the correct location.
   *
   * @param {int} damage - value of the damage taken
   * @param {int} bonusDamage - value of the bonus damage
   * @param {string} location - location of the damage
   * @param {int} ablation - value of the ablation
   * @param {string} ammoVariety - type of ammo used
   * @param {int} ignoreArmorPercent - percentage of armor to ignore
   * @param {int} ignoreBelowSP - value of SP to ignore under
   * @param {boolean} damageLethal - if this damage can cause HP <= 0
   * @param {object} formData - contains booleans about whether to apply shields and other damage reducing effects
   */
  async _applyDamage(
    damage,
    bonusDamage,
    location,
    ablation,
    ammoVariety,
    ignoreArmorPercent,
    ignoreBelowSP,
    damageLethal,
    formData,
  ) {
    const armors = location === "brain" ? [] : this.getEquippedArmors(location);
    const armorData = { value: 0, equipped: armors.length > 0 };
    const totalDamageReduction = this._calculateDamageReduction(formData);

    if (location === "brain")
      return this._applyBrainDamage({
        damage,
        bonusDamage,
        location,
        totalDamageReduction,
        formData,
        armorData,
      });

    const ignoreArmorEntirely = this._determineArmorSP(
      armors,
      location,
      ignoreBelowSP,
      ignoreArmorPercent,
      armorData,
    );

    const shieldAblation = await this._applyShieldDamage({
      damage,
      bonusDamage,
      location,
      ammoVariety,
      armorData,
      formData,
    });
    // A null result means the shield fully absorbed the hit and the card was already rendered.
    if (shieldAblation === null) return undefined;

    return this._applyArmorDamage({
      damage,
      bonusDamage,
      location,
      ablation,
      ignoreArmorPercent,
      ignoreArmorEntirely,
      ignoreBelowSP,
      damageLethal,
      totalDamageReduction,
      armorData,
      armors,
      shieldAblation,
    });
  }

  /**
   * Total damage reduction from role abilities and active effects, per the dialog choices.
   *
   * @param {object} formData - the damage-application dialog data
   * @returns {number}
   */
  _calculateDamageReduction(formData) {
    let reduction = 0;
    if (formData.damageReductionRole) reduction += this._roleDamageReduction();
    if (formData.damageReductionAE)
      reduction += this.bonuses.universalDamageReduction;
    return reduction;
  }

  /** Sum the universal damage-reduction bonuses across all of the actor's roles. */
  _roleDamageReduction() {
    let total = 0;
    for (const role of this.itemTypes.role)
      total += this._roleUniversalReduction(role);
    return total;
  }

  /** The universal damage-reduction contribution of a single role (main ability + subroles). */
  _roleUniversalReduction(role) {
    let total = 0;
    if (role.system.universalBonuses.includes("damageReduction"))
      total += Math.floor(role.system.rank / role.system.bonusRatio);
    const subroleBonuses = role.system.abilities.filter((a) =>
      a.universalBonuses.includes("damageReduction"),
    );
    for (const b of subroleBonuses) total += Math.floor(b.rank / b.bonusRatio);
    return total;
  }

  /**
   * Apply brain (netrun) damage, which ignores armor entirely, then render the damage card.
   *
   * @param {object} ctx - { damage, bonusDamage, location, totalDamageReduction, formData, armorData }
   * @returns {Promise<void>}
   */
  async _applyBrainDamage(ctx) {
    const { damage, bonusDamage, location, formData, armorData } = ctx;
    let reduction = ctx.totalDamageReduction;
    if (formData.brainDamageReduction)
      reduction += this.bonuses.brainDamageReduction;
    const takenDamage = Math.max(damage - reduction, 0);
    const currentHp = this.system.stats.hp.value;
    await this.update({ "system.stats.hp.value": currentHp - takenDamage });
    this._renderDamageCard({
      damage,
      bonusDamage,
      hpReduction: takenDamage,
      totalDamageDealt: damage,
      location,
      totalDamageReduction: reduction,
      armorData,
      brainDamage: true,
    });
  }

  /**
   * Determine the effective armor SP for the location into `armorData.value` (highest equipped SP,
   * reduced by any ignore-armor-percent), and return whether armor is ignored entirely.
   *
   * @param {CPRItem[]} armors - the equipped armors for the location
   * @param {String} location - the hit location
   * @param {number} ignoreBelowSP - armor at or below this SP is ignored entirely
   * @param {number} ignoreArmorPercent - percent of armor to ignore
   * @param {{value:number}} armorData - mutated with the effective SP
   * @returns {boolean} whether armor is ignored entirely
   */
  _determineArmorSP(
    armors,
    location,
    ignoreBelowSP,
    ignoreArmorPercent,
    armorData,
  ) {
    armors.forEach(async (a) => {
      if (location !== "head" && location !== "body") return;
      const newValue = await CPRActorUtils.calculateArmorSP(a, location, true);
      if (newValue > armorData.value) armorData.value = newValue;
    });
    const ignoreArmorEntirely = armorData.value < ignoreBelowSP;
    if (ignoreArmorPercent !== 0 && ignoreArmorEntirely === false)
      armorData.value = Math.round(
        armorData.value - armorData.value * (ignoreArmorPercent / 100),
      );
    return ignoreArmorEntirely;
  }

  /**
   * Ablate the highest-HP equipped shield if the dialog opted to use it. Returns the shield ablation
   * to carry into HP damage, or `null` if the shield fully absorbed the hit (card already rendered).
   *
   * @param {object} ctx - { damage, bonusDamage, location, ammoVariety, armorData, formData }
   * @returns {Promise<number|null>}
   */
  async _applyShieldDamage(ctx) {
    const { damage, bonusDamage, location, ammoVariety, armorData, formData } =
      ctx;
    const shield = this._activeShield(formData);
    if (!shield) return 0;
    const shieldAblation = Math.min(
      damage + bonusDamage,
      shield.system.shieldHitPoints.value,
    );
    await this._ablateArmor("shield", shieldAblation);
    if (!this._shieldAbsorbs(ammoVariety, shield)) return shieldAblation;
    this._renderDamageCard({
      damage,
      bonusDamage,
      hpReduction: 0,
      totalDamageDealt: 0,
      location,
      armorData,
      ablation: 0,
      shieldAblation,
    });
    return null;
  }

  /** The highest-HP equipped shield to use, or null if none is usable / opted-in. */
  _activeShield(formData) {
    const shields = this.getEquippedArmors("shield");
    if (shields.length === 0) return null;
    const shield = shields
      .sort((a, b) =>
        a.system.shieldHitPoints.value > b.system.shieldHitPoints.value
          ? 1
          : -1,
      )
      .reverse()[0];
    if (!formData.useShield || shield.system.shieldHitPoints.value <= 0)
      return null;
    return shield;
  }

  /** Whether the shield fully absorbs the hit: always for non-explosive ammo, else if it survives. */
  _shieldAbsorbs(ammoVariety, shield) {
    if (ammoVariety !== "grenade" && ammoVariety !== "rocket") return true;
    return shield.system.shieldHitPoints.value > 0;
  }

  /**
   * Route armor-location damage to the non-penetrating or penetrating path.
   *
   * @param {object} ctx - the shared damage context
   * @returns {Promise<void>}
   */
  async _applyArmorDamage(ctx) {
    const { damage, armorData, ignoreArmorEntirely } = ctx;
    if (damage <= armorData.value && ignoreArmorEntirely === false)
      return this._applyNonPenetratingDamage(ctx);
    return this._applyPenetratingDamage(ctx);
  }

  /**
   * Damage that did not beat armor: only the bonus damage applies (minus reduction).
   *
   * @param {object} ctx - the shared damage context
   * @returns {Promise<void>}
   */
  async _applyNonPenetratingDamage(ctx) {
    const {
      damage,
      bonusDamage,
      location,
      totalDamageReduction,
      armorData,
      shieldAblation,
    } = ctx;
    const totalDamageDealt = bonusDamage;
    const takenDamage = Math.max(totalDamageDealt - totalDamageReduction, 0);
    const currentHp = this.system.stats.hp.value;
    await this.update({ "system.stats.hp.value": currentHp - takenDamage });
    this._renderDamageCard({
      damage,
      bonusDamage,
      hpReduction: takenDamage,
      rawDamageDealt: 0,
      totalDamageDealt,
      location,
      totalDamageReduction,
      armorData,
      ablation: 0,
      shieldAblation,
    });
  }

  /**
   * Damage that beat armor: bonus + raw (doubled at the head), clamped to non-lethal where required,
   * applied to HP, ablating armor.
   *
   * @param {object} ctx - the shared damage context
   * @returns {Promise<void>}
   */
  async _applyPenetratingDamage(ctx) {
    const {
      damage,
      bonusDamage,
      location,
      ablation,
      ignoreArmorPercent,
      ignoreArmorEntirely,
      ignoreBelowSP,
      damageLethal,
      totalDamageReduction,
      armorData,
      armors,
      shieldAblation,
    } = ctx;
    const rawDamageDealt = this._penetratingRawDamage(
      damage,
      location,
      ignoreArmorEntirely,
      armorData,
    );
    const totalDamageDealt = bonusDamage + rawDamageDealt;
    const currentHp = this.system.stats.hp.value;
    const takenDamage = this._clampTakenDamage(
      Math.max(totalDamageDealt - totalDamageReduction, 0),
      currentHp,
      damageLethal,
    );
    await this.update({ "system.stats.hp.value": currentHp - takenDamage });
    if (armors.length > 0) await this._ablateArmor(location, ablation);
    this._renderDamageCard({
      damage,
      bonusDamage,
      hpReduction: takenDamage,
      rawDamageDealt,
      totalDamageDealt,
      location,
      totalDamageReduction,
      armorData,
      ignoreArmorPercent,
      ignoreArmorEntirely,
      ignoreBelowSP,
      ablation: armors.length > 0 ? ablation : 0,
      shieldAblation,
      damageLethal,
    });
  }

  /** Raw HP damage after armor: `damage - armorSP`, doubled for head hits; armorSP is 0 if ignored. */
  _penetratingRawDamage(damage, location, ignoreArmorEntirely, armorData) {
    const armorSPRef = ignoreArmorEntirely ? 0 : armorData.value;
    return location === "head"
      ? 2 * (damage - armorSPRef)
      : damage - armorSPRef;
  }

  /** Clamp non-lethal damage so it cannot drop a living actor below 1 HP (never heals). */
  _clampTakenDamage(takenDamage, currentHp, damageLethal) {
    if (takenDamage < currentHp || damageLethal) return takenDamage;
    return currentHp <= 0 ? 0 : currentHp - 1;
  }

  /** Render the damage-application chat card for this actor. */
  _renderDamageCard(fields) {
    CPRChat.RenderDamageApplicationCard({ actor: this, ...fields });
  }

  /**
   * Reverse damage and armor/shield ablation to the actor, in case someone made a mistake applying it.
   *
   * @param {int} hpReduction - value of the damage taken
   * @param {string} location - location of the damage
   * @param {int} ablation - value of the armor ablation
   * @param {int} shieldAblation - value of the shield ablation
   */
  async _reverseDamage(hpReduction, location, ablation, shieldAblation) {
    const currentHp = this.system.stats.hp.value;
    const maxHp = this.system.stats.hp.max;
    if (maxHp > currentHp + hpReduction) {
      await this.update({
        "system.stats.hp.value": currentHp + hpReduction,
      });
    } else {
      await this.update({ "system.stats.hp.value": maxHp });
    }
    await this._ablateArmor(location, -ablation);
    await this._ablateArmor("shield", -shieldAblation);
  }

  /**
   * Ablate the equipped armor at the specified location by the given value.
   *
   * @param {string} location - location of the ablation
   * @param {int} ablation - value of the ablation
   */
  async _ablateArmor(location, ablation) {
    const armorList = this.getEquippedArmors(location);
    const updateList = [];
    //
    // Define config for each location
    const config = {
      head: {
        path: "system.headLocation.ablation",
        spPath: "system.headLocation.sp",
        upgradeKey: "headSp",
        externalPath: "system.externalData.currentArmorHead.value",
        externalMax: this.system.externalData.currentArmorHead.max,
        externalValue: this.system.externalData.currentArmorHead.value,
      },
      body: {
        path: "system.bodyLocation.ablation",
        spPath: "system.bodyLocation.sp",
        upgradeKey: "bodySp",
        externalPath: "system.externalData.currentArmorBody.value",
        externalMax: this.system.externalData.currentArmorBody.max,
        externalValue: this.system.externalData.currentArmorBody.value,
      },
      shield: {
        path: "system.shieldHitPoints.value",
        spPath: "system.shieldHitPoints.max",
        upgradeKey: null, // shields dont use upgradeData
        externalPath: "system.externalData.currentArmorShield.value",
        externalMax: this.system.externalData.currentArmorShield.max,
        externalValue: this.system.externalData.currentArmorShield.value,
      },
    };

    const cfg = config[location];
    if (!cfg) return; // exit if location not supported

    armorList.forEach((armor) => {
      const sp = Number(foundry.utils.getProperty(armor, cfg.spPath));
      const ablationValue = Number(foundry.utils.getProperty(armor, cfg.path));

      // Calculate effective SP (skip if no upgradeData)
      let armorSp = sp;
      if (cfg.upgradeKey) {
        const upgradeData = armor.getTotalUpgradeValues(cfg.upgradeKey);
        armorSp =
          upgradeData.type === "override"
            ? upgradeData.value
            : sp + upgradeData.value;
      }

      // Clamp new ablation
      const newAblation =
        ablation < 0
          ? Math.max(ablationValue + ablation, 0)
          : Math.min(ablationValue + ablation, armorSp);

      updateList.push({
        _id: armor.id,
        [cfg.path]: newAblation,
      });
    });

    await this.updateEmbeddedDocuments("Item", updateList);

    // Update actor external data as armor is ablated:
    const currentArmorValue =
      ablation < 0
        ? Math.min(cfg.externalValue - ablation, cfg.externalMax)
        : Math.max(cfg.externalValue - ablation, 0);

    await this.update({ [cfg.externalPath]: currentArmorValue });
  }

  /**
   * Warning!
   *
   * When a user changes sheets (character/mook), the type for the actor itself does not change.
   * This forces us to put actor code in the same place, and have the sheets encode specific behaviors,
   * not the actors. Below you're going to see methods that look like they belong in cpr-mook.js
   * or cpr-character.js, but doing so will result in broken functionality if a user swaps sheets.
   */

  /** CHARACTER SPECIFIC CODE */

  /**
   * Calculate the character's max HP based on stats and effects.
   *
   * @return {Number}
   */
  calcMaxHp() {
    const { stats } = this.system;
    let maxHp = 10 + 5 * Math.ceil((stats.will.value + stats.body.value) / 2);
    maxHp += this.bonuses.maxHp; // from any active effects
    return maxHp;
  }

  /**
   * Calculate the character's Humanity based on stats and effects.
   *
   * @return {Number}
   * @private
   */
  _calcMaxHumanity() {
    const cprData = this.system;
    const { stats } = cprData;
    let cyberwarePenalty = 0;
    const installedCyberware = this.itemTypes.cyberware.filter(
      (cw) => cw.system.isInstalledInActor,
    );
    installedCyberware.forEach((cyberware) => {
      if (cyberware.system.type === "borgware") {
        cyberwarePenalty += 4;
      } else if (parseInt(cyberware.system.humanityLoss.static, 10) > 0) {
        cyberwarePenalty += 2;
      }
    });
    let maxHumanity = 10 * stats.emp.max - cyberwarePenalty; // minus sum of installed cyberware
    maxHumanity += this.bonuses.maxHumanity; // from any active effects
    return maxHumanity;
  }

  /**
   * Calculate the max humanity on this actor.
   * If current humanity is full and the max changes, we should update the current and EMP to match only
   * if the new max is less than the old max.
   * We assume that to be preferred behavior more often than not, especially during character creation.
   *
   * @callback
   */
  async setMaxHumanity() {
    const maxHumanity = this._calcMaxHumanity();
    const { humanity } = this.system.stats;
    if (humanity.max === humanity.value && maxHumanity < humanity.max) {
      await this.update({
        "system.stats.humanity.max": maxHumanity,
        "system.stats.humanity.value": maxHumanity,
        "system.stats.emp.value": Math.floor(humanity.value / 10),
      });
    } else {
      await this.update({
        "system.stats.humanity.max": maxHumanity,
        "system.stats.emp.value": Math.floor(humanity.value / 10),
      });
    }
  }

  /**
   * Called when cyberware is installed, this method decreases Humanity on an actor, rolling
   * for the value if need be.
   *
   * You may think this should be in cpr-character only since Humanity is overlooked for NPCs, however
   * because users can switch between mook and character sheets independent of actor type, we
   * have to keep this here. (i.e. they can create a mook but switch to the character sheet)
   *
   * @param {Array<CPRItem>} itemArray - a list of cyberware being installed
   * @param {String} humanityLossType - Whether to "roll" for humanity loss, take "static" loss, or to lose "None" at all.
   * @returns {@Promise}
   */
  async loseHumanityValue(itemArray, humanityLossType) {
    if (humanityLossType === "none") return this.setMaxHumanity();

    const { humanity } = this.system.stats;
    const start = Number.isInteger(humanity.value)
      ? humanity.value
      : humanity.max;
    const value = await this._rollHumanityLoss(
      itemArray,
      humanityLossType,
      start,
    );

    if (value <= 0) Rules.lawyer(false, "CPR.messages.youCyberpsycho");
    await this.update({ "system.stats.humanity.value": value });
    return this.setMaxHumanity();
  }

  /**
   * Roll the Humanity Loss for each item, rendering a roll card per item, and return the remaining
   * Humanity value.
   *
   * @param {CPRItem[]} itemArray - the items causing Humanity Loss
   * @param {String} humanityLossType - "rolled" or "static"
   * @param {number} start - the starting Humanity value
   * @returns {Promise<number>} the Humanity value after all losses
   */
  async _rollHumanityLoss(itemArray, humanityLossType, start) {
    let value = start;
    for (const item of itemArray) {
      // Cast the formula to a string in case of a static loss (a Number); strings are unchanged.
      const formula = `${item.system.humanityLoss[humanityLossType]}`;
      const humRoll = CPRRolls.CPRHumanityLossRoll.create(item.name, formula);
      await humRoll.roll();
      value -= humRoll.resultTotal;
      humRoll.entityData = {
        actor: this.id,
        static: humanityLossType === "static",
      };
      CPRChat.RenderRollCard(humRoll);
    }
    return value;
  }

  /**
   * Persist life path information to the actor model
   *
   * Again, this should be in cpr-character only since Humanity is overlooked for NPCs, but
   * users can switch between sheet types.
   *
   * @param {Object} formData  - an object of answers provided by the user in a form
   * @returns {Object}
   */
  setLifepath(lifepathData) {
    return this.update({ "system.lifepath": lifepathData });
  }

  /** MOOK SPECIFIC CODE */

  /**
   * Called by the createOwnedItem listener (hook) when a user drags an item on a mook sheet
   * It handles the automatic equipping of gear and installation of cyberware.
   *
   * @param {CPRItem} item - the item document that was dragged
   * @returns {Promise}
   */
  async handleMookDraggedItem(item) {
    if (item.type === "criticalInjury") return item;

    const allInstalled = item.recursiveGetAllInstalledItems();
    if (item.type === "cyberware") {
      // On a failed auto-install the item (and its installed tree) is removed; return that result.
      const removed = await this._autoInstallMookCyberware(item, allInstalled);
      if (removed) return removed;
    }
    return this._autoEquipMookItems(item, allInstalled);
  }

  /**
   * Auto-install dragged cyberware on a mook; on failure delete the item and its installed tree.
   *
   * @param {CPRItem} item - the dragged cyberware
   * @param {CPRItem[]} allInstalled - items installed within `item`
   * @returns {Promise<null|Array>} null if installed, else the delete result
   */
  async _autoInstallMookCyberware(item, allInstalled) {
    const installResult = await this.installCyberware(item._id);
    if (installResult) return null;
    const deleteInstalled = allInstalled.map((i) => i._id);
    return this.deleteEmbeddedDocuments(
      "Item",
      [...deleteInstalled, item._id],
      { deleteInstalled: true },
    );
  }

  /**
   * Auto-equip a dragged item and its installed items where they are equippable.
   *
   * @param {CPRItem} item - the dragged item
   * @param {CPRItem[]} allInstalled - items installed within `item`
   * @returns {Promise<Array>}
   */
  _autoEquipMookItems(item, allInstalled) {
    const updateData = [];
    if (SystemUtils.hasMixin(item.type, "equippable"))
      updateData.push({ _id: item._id, "system.equipped": "equipped" });
    allInstalled.forEach((i) => {
      if (SystemUtils.hasMixin(i.type, "equippable"))
        updateData.push({ _id: i._id, "system.equipped": "equipped" });
    });
    return this.updateEmbeddedDocuments("Item", updateData);
  }

  /**
   * `itemHolder` hook: whether item creation should attempt stacking. Characters and mooks only stack
   * while their own sheet is open (a container always stacks — the mixin default).
   *
   * @returns {Boolean}
   */
  _shouldStackOnCreate() {
    return Object.values(this.apps).some(
      (app) =>
        app instanceof CPRCharacterActorSheet ||
        app instanceof CPRMookActorSheet,
    );
  }

  /**
   * `itemHolder` hook: when items are dropped on a mook sheet, run the mook auto-equip / auto-install
   * handling for each created item.
   *
   * @param {Array<CPRItem>} createdItems - the items just created on this actor
   * @returns {Promise<void>}
   */
  async _postCreateEmbeddedItems(createdItems) {
    const isMookSheet = Object.values(this.apps).some(
      (app) => app instanceof CPRMookActorSheet,
    );
    if (!isMookSheet) return;
    for (const item of createdItems) {
      await this.handleMookDraggedItem(item);
    }
  }

  /**
   * Return whether the actor has a specific Item Type equipped.
   *
   * @public
   * @param {string} itemType - type of item we are looking for
   * @returns {Boolean}
   */
  hasItemTypeEquipped(itemType) {
    let equipped = false;
    if (this.itemTypes[itemType]) {
      this.itemTypes[itemType].forEach((i) => {
        if (i.system.equipped) {
          if (i.system.equipped === "equipped") {
            equipped = true;
          }
        }
      });
    }
    return equipped;
  }

  /**
   * Create an active effect on this actor. This method belongs here so migration scripts can
   * dynamically generate effects based on custom mods already on the actor from earlier versions.
   *
   * @param {Boolean} render - Render the effect's sheet or not. Default true.
   * @returns {CPRActiveEffect} the new document
   */
  async createEffect(render = true) {
    const effectDoc = await this.createEmbeddedDocuments("ActiveEffect", [
      {
        name: SystemUtils.Localize("CPR.itemSheet.effects.newEffect"),
        icon: "icons/svg/aura.svg",
        origin: this.uuid, // Do we still want this here?
        disabled: false,
      },
    ]);

    return effectDoc[0].sheet.render(render);
  }

  copyEffect(effect) {
    const newEffect = foundry.utils.duplicate(effect);
    return this.createEmbeddedDocuments("ActiveEffect", [newEffect]);
  }

  /**
   * Delete the desired effect from this actor. Pops up a confirmation box if permitted.
   *
   * @param {CPRActiveEffect} effect - the effect to delete
   * @returns null
   */
  static async deleteEffect(effect) {
    const setting = game.settings.get(game.system.id, "deleteItemConfirmation");
    if (setting) {
      const dialogMessage = `${SystemUtils.Localize(
        "CPR.dialog.deleteConfirmation.message",
      )} ${effect.name}?`;

      // Show confirmation dialog.
      const confirmDelete = await cprConfirm(dialogMessage, {
        title: SystemUtils.Localize("CPR.dialog.deleteConfirmation.title"),
      });
      if (!confirmDelete) return;
    }
    effect.delete();
  }
}
