/* eslint-disable max-classes-per-file */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import * as CPRRollDialogs from "../dialog/cpr-roll-dialog.js";

const { Roll } = foundry.dice;

/**
 * The generic CPR roll. It now **extends Foundry's Roll** rather than wrapping it: the dice (including
 * Cyberpunk RED's critical mechanics via the `red`/`dmg` die modifiers) are evaluated natively, so the
 * roll is serialisable, reconstructable on other clients, and animated by Dice So Nice for free.
 *
 * CPR-specific state (title, mods, stat/skill values, luck, template paths, …) lives as flat instance
 * properties so the existing roll dialog and chat-card templates keep working unchanged. {@link toJSON}
 * snapshots that state into `options.cprState` for the serialisation round-trip, and the constructor
 * restores it — which also captures any mutations the dialog made before the roll was sent to chat.
 *
 * Ergonomic construction is done through the static `create()` factories (one per subclass); the
 * constructor itself takes Foundry's `(formula, data, options)` signature because that is how
 * `Roll.fromData` reconstructs a roll.
 */
export class CPRRoll extends Roll {
  /**
   * @param {String} formula - the dice formula evaluated by Foundry (e.g. "1d10red", "2d6dmg").
   * @param {Object} data - roll data for @-substitution (unused for now).
   * @param {Object} options - Roll options; CPR state is restored from `options.cprState`.
   */
  constructor(formula = "1d10", data = {}, options = {}) {
    super(formula, data, options);

    // Defaults for a freshly-built or directly-constructed roll.
    this.rollTitle = this.constructor.name;
    this.die = CPRRoll.dieOf(formula);
    this.mods = [];
    this.additionalMods = [];
    this.faces = [];
    this.initialRoll = 0;
    this.criticalRoll = 0;
    this.resultTotal = 0;
    this.luck = 0;
    this.calculateCritical = true;
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-base-verify-roll-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-base-rollcard.hbs`;
    this.rollCardExtraArgs = {};

    // Restore snapshotted CPR state (from a factory's cprState, or a fromData round-trip).
    if (options.cprState) Object.assign(this, options.cprState);
  }

  /**
   * Foundry's `Roll.formula` is getter-only, but some verify-roll dialog forms include a display-only
   * `formula` field. `mergeObject(roll, formData)` would then throw trying to set it, so expose a
   * delegating getter and a no-op setter.
   *
   * @returns {String}
   */
  get formula() {
    return super.formula;
  }

  set formula(_value) {
    // Display-only dialog field; the real formula is fixed at construction.
  }

  /**
   * Extract the "dXX" denomination from a formula for display on the roll card.
   *
   * @param {String} formula
   * @returns {String}
   */
  static dieOf(formula) {
    const match = String(formula).match(/d[0-9]+/i);
    return match ? match[0].toLowerCase() : "d10";
  }

  /**
   * Split a user/legacy formula ("2d6+3", "5") into the dice term and a list of flat numeric mods.
   *
   * @param {String} formula
   * @returns {{dice: String, die: String, mods: Array<{value:Number, source:String}>}}
   */
  static splitFormula(formula) {
    const lower = String(formula).toLowerCase();
    // A bare number is a static value (e.g. flat damage).
    if (!Number.isNaN(+lower)) {
      return { dice: lower, die: CPRRoll.dieOf(lower), mods: [] };
    }
    const diceRgx = /[0-9]*d[0-9]+/;
    const [dice] = lower.match(diceRgx) ?? ["1d10"];
    const mods = [];
    const remainder = lower.replace(diceRgx, "").replace(/\s+/g, "");
    const modMatches = remainder.match(/[+-][0-9]+/g) ?? [];
    modMatches.forEach((m) => {
      mods.push({
        value: Number(m),
        source: SystemUtils.Localize("CPR.rolls.modifiers.sources.rollFormula"),
      });
    });
    return { dice, die: CPRRoll.dieOf(dice), mods };
  }

  /**
   * Build the CPR state object (the source of truth that gets snapshotted) from a legacy formula plus
   * overrides. Subclass `create()` factories call this, then construct themselves with the resulting
   * dice formula and cprState.
   *
   * @param {String} formula - the legacy formula (dice + optional flat mods)
   * @param {String} modifier - die modifier to append ("red", "dmg", or "")
   * @param {Object} state - extra CPR state (rollTitle, rollCard, statName, statValue, …)
   * @returns {{evalFormula: String, cprState: Object}}
   */
  static buildState(formula, modifier, state = {}) {
    const { dice, die, mods } = CPRRoll.splitFormula(formula);
    const evalFormula = modifier ? `${dice}${modifier}` : dice;
    const cprState = {
      die,
      mods,
      ...state,
    };
    return { evalFormula, cprState };
  }

  /**
   * Generic factory for a base roll.
   *
   * @param {String} rollTitle
   * @param {String} formula
   * @returns {CPRRoll}
   */
  static create(rollTitle, formula) {
    const { evalFormula, cprState } = CPRRoll.buildState(formula, "", {
      rollTitle,
    });
    return new CPRRoll(evalFormula, {}, { cprState });
  }

  /**
   * Serialise only the native roll (dice terms, formula, total). The bespoke card is delivered as static
   * HTML in the chat message's `content`, so a serialised/reconstructed roll only needs its dice — for
   * Dice So Nice and inline expansion. The rich CPR state is dropped here because it can reference
   * Documents (combatant, items in `rollCardExtraArgs`/`entityData`) and CPRMods, which would otherwise
   * bloat or break message serialisation. Reconstruction falls back to default CPR state, which is never
   * read once the card is rendered.
   *
   * @override
   * @returns {Object}
   */
  toJSON() {
    const json = super.toJSON();
    json.options = {};
    return json;
  }

  /**
   * Apply a mod object to the roll. A mod needs at least `{ value: Number, source: String }`.
   *
   * @param {Array} modArray
   */
  addMod(modArray) {
    if (Array.isArray(modArray)) {
      modArray.forEach((m) => {
        if (this.mods.find((mod) => m.id && mod.id === m.id)) {
          LOGGER.warn("Mod already exists on the roll. Skipping:", m);
          return;
        }
        if (m && m.value !== 0) this.mods.push(m);
      });
    } else {
      LOGGER.error("addMod expects an Array of CPRMod-like objects:", modArray);
    }
  }

  /**
   * Remove a mod from the roll by id.
   *
   * @param {String} id
   */
  removeMod(id) {
    const modIndex = this.mods.findIndex((m) => m.id === id);
    if (modIndex !== -1) this.mods.splice(modIndex, 1);
  }

  /**
   * Sum all permanent and user-entered mods.
   *
   * @returns {Number}
   */
  totalMods() {
    let modTotal = 0;
    this.mods.forEach((mod) => {
      modTotal += mod.value;
    });
    this.additionalMods.forEach((value) => {
      modTotal += value ? Number.parseInt(value, 10) : 0;
    });
    return this.mods.length > 0 || this.additionalMods.length > 0
      ? modTotal
      : 0;
  }

  /**
   * Perform the roll: evaluate the dice natively (Foundry handles the `red`/`dmg` modifiers), then read
   * the critical results off the evaluated term and compute the final displayed total.
   *
   * @async
   * @returns {CPRRoll}
   */
  async roll() {
    if (!this._evaluated) await this.evaluate();
    this._readDiceResults();
    this._computeResult();
    return this;
  }

  /**
   * Populate `faces`, `initialRoll` and `criticalRoll` from the evaluated dice term. `red`'s bonus and
   * penalty dice are flagged `cprBonus`; everything else is the base roll.
   *
   * @private
   */
  _readDiceResults() {
    const term = this.dice[0];
    if (!term) {
      this.faces = [];
      this.initialRoll = 0;
      this.criticalRoll = 0;
      return;
    }
    const base = term.results.filter((r) => r.active && !r.cprBonus);
    const bonus = term.results.filter((r) => r.cprBonus);
    this.faces = base.map((r) => r.result);
    this.initialRoll = base.reduce((t, r) => t + (r.count ?? r.result), 0);
    this.criticalRoll = bonus.reduce((t, r) => t + (r.count ?? r.result), 0);
  }

  /**
   * Compute the base result (dice total — already including any red explode/implode — plus mods and
   * luck). Subclasses add stat/skill/role/etc. values.
   *
   * @private
   * @returns {Number}
   */
  _computeBase() {
    return this._diceTotal() + this.totalMods() + this.luck;
  }

  /**
   * The native dice total once evaluated (includes red's explode/implode contributions).
   *
   * @private
   * @returns {Number}
   */
  _diceTotal() {
    return this._evaluated ? this.total : 0;
  }

  /**
   * Save the final displayed result. Criticals are already baked into the native dice total, so this is
   * just the base computation.
   *
   * @private
   */
  _computeResult() {
    this.resultTotal = this._computeBase();
  }

  /**
   * @returns {Boolean} whether the check die explode-d (a natural max under the `red` modifier).
   */
  wasCritSuccess() {
    const term = this.dice[0];
    return !!term && term.results.some((r) => r.cprSuccess);
  }

  /**
   * @returns {Boolean} whether the check die implode-d (a natural 1 under the `red` modifier).
   */
  wasCritFail() {
    const term = this.dice[0];
    return !!term && term.results.some((r) => r.cprFailure);
  }

  /**
   * @returns {Boolean}
   */
  wasCritical() {
    return this.wasCritFail() || this.wasCritSuccess();
  }

  /**
   * Pop up the roll confirmation dialog, then merge any changes back onto this roll.
   *
   * @param {Object} event
   * @param {CPRActor} actor
   * @param {CPRItem} item
   * @returns {Boolean}
   */
  async handleRollDialog(event, actor, item) {
    let skipDialog = event.ctrlKey || event.metaKey;
    if (event.type === "click") {
      const ctrlSetting = game.settings.get(
        game.system.id,
        "invertRollCtrlFunction",
      );
      skipDialog = ctrlSetting ? !skipDialog : skipDialog;
    }

    if (!skipDialog) {
      let DialogClass;
      switch (this.constructor) {
        // eslint-disable-next-line no-use-before-define
        case CPRRoleRoll:
          DialogClass = CPRRollDialogs.CPRRoleRollDialog;
          break;
        default:
          DialogClass = CPRRollDialogs.CPRRollDialog;
          break;
      }

      const dialogData = await DialogClass.showDialog(this, actor, item).catch(
        (err) => LOGGER.debug(err),
      );
      if (dialogData === undefined) return false;
      foundry.utils.mergeObject(this, dialogData, { overwrite: true });
    }
    return true;
  }
}

/**
 * Initiative rolls are stat rolls on REF (or a substitute) with combatant context.
 */
export class CPRInitiative extends CPRRoll {
  static create(combatant, formula, statName, statValue) {
    const hasDice = /d[0-9]+/.test(String(formula));
    const calculateCritical = game.settings.get(
      game.system.id,
      "criticalInitiative",
    );
    const { evalFormula, cprState } = CPRRoll.buildState(
      hasDice ? formula : "1d10",
      // Only explode/implode initiative when the setting is enabled.
      calculateCritical ? "red" : "",
      {
        rollTitle: SystemUtils.Localize("CPR.chat.initiative"),
        combatant,
        statName,
        statValue,
        rollCard: `systems/${game.system.id}/templates/chat/cpr-initiative-rollcard.hbs`,
        calculateCritical,
      },
    );
    // Static initiative for Black ICE & Demons passes a flat value, not dice.
    if (!hasDice) cprState.staticFormula = formula;
    return new CPRInitiative(evalFormula, {}, { cprState });
  }

  _computeBase() {
    if (this.staticFormula !== undefined) {
      return Number(this.staticFormula) + this.totalMods();
    }
    return this._diceTotal() + this.totalMods() + this.statValue + this.luck;
  }
}

/**
 * A stat roll: STAT + 1d10.
 */
export class CPRStatRoll extends CPRRoll {
  static create(name, value) {
    const { evalFormula, cprState } = CPRRoll.buildState("1d10", "red", {
      rollTitle: name,
      statName: name,
      statValue: value,
      rollCard: `systems/${game.system.id}/templates/chat/cpr-stat-rollcard.hbs`,
    });
    return new this(evalFormula, {}, { cprState });
  }

  _computeBase() {
    return this._diceTotal() + this.totalMods() + this.statValue + this.luck;
  }
}

/**
 * A program stat roll uses the net-combat prompt and card.
 */
export class CPRProgramStatRoll extends CPRStatRoll {
  static create(name, value) {
    const roll = super.create(name, value);
    roll.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-net-roll-prompt.hbs`;
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-stat-rollcard.hbs`;
    return roll;
  }

  setNetCombat(rollTitle) {
    this.rollTitle = rollTitle;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-stat-rollcard.hbs`;
  }
}

/**
 * Skill roll: STAT + Skill + 1d10.
 */
export class CPRSkillRoll extends CPRStatRoll {
  static create(statName, statValue, skillName, skillValue) {
    const roll = super.create(skillName, statValue);
    roll.statName = statName;
    roll.skillName = skillName;
    roll.skillValue = skillValue;
    const key = `CPR.global.itemType.skill.${SystemUtils.slugify(skillName)}`;
    roll.rollTitle =
      SystemUtils.Localize(key) === key ? skillName : SystemUtils.Localize(key);
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-skill-rollcard.hbs`;
    return roll;
  }

  _computeBase() {
    return (
      this._diceTotal() +
      this.totalMods() +
      this.statValue +
      this.skillValue +
      this.luck
    );
  }
}

/**
 * Facedown roll: COOL + Rep + 1d10.
 */
export class CPRFacedownRoll extends CPRStatRoll {
  static create(statName, statValue, repValue) {
    const roll = super.create(statName, statValue);
    roll.repValue = repValue;
    roll.rollTitle = SystemUtils.Localize("CPR.dialog.facedown.title");
    roll.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-facedown-prompt.hbs`;
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-facedown-rollcard.hbs`;
    return roll;
  }

  _computeBase() {
    return super._computeBase() + Number.parseInt(this.repValue, 10);
  }
}

/**
 * Humanity loss: Nd6 (or a static value), no criticals.
 */
export class CPRHumanityLossRoll extends CPRRoll {
  static create(name, humanityLoss) {
    const { evalFormula, cprState } = CPRRoll.buildState(humanityLoss, "", {
      rollTitle: SystemUtils.Localize(
        "CPR.dialog.installCyberware.humanityLoss",
      ),
      calculateCritical: false,
      cyberwareName: name,
      rollCard: `systems/${game.system.id}/templates/chat/cpr-humanity-loss-rollcard.hbs`,
    });
    return new CPRHumanityLossRoll(evalFormula, {}, { cprState });
  }
}

/**
 * Attack roll: like a skill roll, with a weapon type recorded for the linked damage roll.
 */
export class CPRAttackRoll extends CPRSkillRoll {
  static create(
    attackName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType,
  ) {
    const roll = super.create(statName, statValue, skillName, skillValue);
    roll.rollTitle = `${attackName}`;
    roll.weaponType = weaponType;
    roll.location = "body";
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-attack-rollcard.hbs`;
    return roll;
  }
}

/**
 * Aimed attack: records location and a -8 mod.
 */
export class CPRAimedAttackRoll extends CPRAttackRoll {
  static create(
    weaponName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType,
  ) {
    const roll = super.create(
      weaponName,
      statName,
      statValue,
      skillName,
      skillValue,
      weaponType,
    );
    roll.rollTitle = `${weaponName}`;
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-aimed-attack-rollcard.hbs`;
    roll.addMod([{ value: -8, source: "Aimed Shot Penalty" }]);
    roll.location = "head";
    return roll;
  }
}

/**
 * Autofire attack: specialised title and card.
 */
export class CPRAutofireRoll extends CPRAttackRoll {
  static create(
    weaponName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType,
  ) {
    const roll = super.create(
      weaponName,
      statName,
      statValue,
      skillName,
      skillValue,
      weaponType,
    );
    roll.rollTitle = `${weaponName}`;
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-autofire-rollcard.hbs`;
    return roll;
  }
}

/**
 * Suppressive fire: specialised title and card.
 */
export class CPRSuppressiveFireRoll extends CPRAttackRoll {
  static create(
    weaponName,
    statName,
    statValue,
    skillName,
    skillValue,
    weaponType,
  ) {
    const roll = super.create(
      weaponName,
      statName,
      statValue,
      skillName,
      skillValue,
      weaponType,
    );
    roll.rollTitle = `${weaponName}`;
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-suppressive-fire-rollcard.hbs`;
    return roll;
  }
}

/**
 * Role ability roll: Role + Skill + STAT + 1d10.
 */
export class CPRRoleRoll extends CPRRoll {
  static create(
    roleName,
    roleValue,
    skillName,
    skillValue,
    statName,
    statValue,
    skillList,
  ) {
    const { evalFormula, cprState } = CPRRoll.buildState("1d10", "red", {
      rollTitle: roleName,
      roleName,
      roleValue,
      skillName,
      skillValue,
      statName,
      statValue,
      skillList,
      rollPrompt: `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-roleAbility-prompt.hbs`,
      rollCard: `systems/${game.system.id}/templates/chat/cpr-role-rollcard.hbs`,
    });
    return new this(evalFormula, {}, { cprState });
  }

  _computeBase() {
    return (
      this._diceTotal() +
      this.totalMods() +
      this.roleValue +
      this.skillValue +
      this.statValue +
      this.luck
    );
  }
}

/**
 * Interface roll: NET actions/attacks from the Fight tab.
 */
export class CPRInterfaceRoll extends CPRRoleRoll {
  static create(
    rollType,
    roleName,
    roleValue,
    statName = null,
    statValue = null,
  ) {
    const roll = super.create(
      roleName,
      roleValue,
      null,
      0,
      statName,
      statValue ?? 0,
      [],
    );
    roll.rollType = rollType;
    roll.statName = statName;
    roll.statValue = statValue ?? 0;
    roll.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-net-roll-prompt.hbs`;
    roll.rollCard = `systems/${game.system.id}/templates/chat/cpr-cyberdeck-rollcard.hbs`;
    return roll;
  }

  setProgramRollCard() {
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-attack-rollcard.hbs`;
  }

  _computeBase() {
    return (
      this._diceTotal() +
      this.totalMods() +
      this.roleValue +
      this.statValue +
      this.luck
    );
  }
}

/**
 * Death save: 1d10 roll-under BODY, with penalties; no criticals.
 */
export class CPRDeathSaveRoll extends CPRRoll {
  static create(penalty, basePenalty, bodyStat) {
    const { evalFormula, cprState } = CPRRoll.buildState("1d10", "", {
      rollTitle: SystemUtils.Localize("CPR.rolls.deathSave.title"),
      calculateCritical: false,
      penalty,
      basePenalty,
      bodyStat,
      saveResult: null,
      rollPrompt: `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-deathsave-prompt.hbs`,
      rollCard: `systems/${game.system.id}/templates/chat/cpr-deathsave-rollcard.hbs`,
    });
    return new CPRDeathSaveRoll(evalFormula, {}, { cprState });
  }

  _computeBase() {
    return (
      this._diceTotal() + this.basePenalty + this.penalty + this.totalMods()
    );
  }
}

/**
 * Luck Roll: a homebrew (JonJon's) roll-under check on the LUCK stat. A straight 1d10 (no `red`
 * modifier, so no explode/implode) succeeds when it rolls strictly under the LUCK target — mirroring a
 * Death Save. The target is the LUCK max or current value depending on the homebrew variant setting.
 */
export class CPRLuckRoll extends CPRRoll {
  static create(luckTarget, luckVariant) {
    const { evalFormula, cprState } = CPRRoll.buildState("1d10", "", {
      rollTitle: SystemUtils.Localize("CPR.rolls.luckRoll.title"),
      calculateCritical: false,
      luckTarget,
      luckVariant,
      saveResult: null,
      rollPrompt: `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-luck-prompt.hbs`,
      rollCard: `systems/${game.system.id}/templates/chat/cpr-luck-rollcard.hbs`,
    });
    return new CPRLuckRoll(evalFormula, {}, { cprState });
  }

  _computeBase() {
    return this._diceTotal() + this.totalMods();
  }

  /**
   * Assess the roll-under result: success rolls strictly under the LUCK target; a natural 10 always
   * fails. Returns the localized "Success"/"Failure" string for the chat card's `saveResult`.
   *
   * @returns {String}
   */
  computeSaveResult() {
    const success = SystemUtils.Localize("CPR.rolls.success");
    const failed = SystemUtils.Localize("CPR.rolls.failed");
    if (this.initialRoll === 10) return failed;
    return this.resultTotal < this.luckTarget ? success : failed;
  }
}

/**
 * Damage roll: Nd6 (any die), `dmg` marker, criticals by 2+ max (handled by the modifier + consequence).
 */
export class CPRDamageRoll extends CPRRoll {
  /**
   * Build the `dmg` marker modifier string from a crit config and the die's faces. RAW (2 dice at the
   * die's max face) is the bare `dmg`; `count 0` disables crits (`dmg0`); anything else is explicit.
   *
   * @param {Object} critConfig - { threshold, count } (threshold 0 = the die's max face)
   * @param {Number} faces - the damage die's number of faces
   * @returns {String}
   */
  static dmgModifier(critConfig, faces) {
    const count = critConfig?.count ?? 2;
    if (count === 0) return "dmg0";
    const threshold =
      critConfig?.threshold && critConfig.threshold > 0
        ? critConfig.threshold
        : faces;
    if (count === 2 && threshold === faces) return "dmg";
    return `dmg${count}>=${threshold}`;
  }

  /**
   * @param {String} rollTitle
   * @param {String} formula - the damage dice (e.g. "2d6", "3d6+2", "2d6 + @stats.body")
   * @param {String} weaponType
   * @param {Object} critConfig - { threshold, count, bonus }; defaults to RAW (2+ max → +5).
   * @param {Object} rollData - roll data for `@`-references in the formula (e.g. the item's getRollData)
   */
  static create(
    rollTitle,
    formula,
    weaponType,
    critConfig = {},
    rollData = {},
  ) {
    // Resolve any `@`-references (e.g. `@stats.body`) to numbers before splitting, otherwise
    // splitFormula would discard them. Unknown references resolve to 0.
    const resolvedFormula = Roll.replaceFormulaData(String(formula), rollData, {
      missing: "0",
      warn: false,
    });
    const targetedTokens = SystemUtils.getUserTargetedOrSelected("targeted");
    if (
      targetedTokens.length === 0 &&
      game.settings.get(game.system.id, "warnAboutNoTargetsWhenRollingDamage")
    ) {
      SystemUtils.DisplayMessage(
        "warn",
        "CPR.chat.damageApplication.noTokenTargeted",
      );
    }
    const { dice, die, mods } = CPRRoll.splitFormula(resolvedFormula);
    const faces = parseInt(die.replace(/d/i, ""), 10) || 6;
    const cprState = {
      die,
      mods,
      rollTitle,
      weaponType,
      calculateCritical: false,
      bonusDamage: critConfig.bonus ?? 5,
      isAimed: false,
      location: "body",
      isAutofire: false,
      autofireMultiplier: 0,
      autofireMultiplierMax: 0,
      rollPrompt: `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-damage-prompt.hbs`,
      rollCard: `systems/${game.system.id}/templates/chat/cpr-damage-rollcard.hbs`,
    };
    const evalFormula = `${dice}${CPRDamageRoll.dmgModifier(critConfig, faces)}`;
    return new CPRDamageRoll(evalFormula, {}, { cprState });
  }

  _computeBase() {
    this.autofireMultiplier = Math.min(
      this.autofireMultiplier,
      this.autofireMultiplierMax,
    );
    const damageMultiplier = this.isAutofire ? this.autofireMultiplier : 1;
    return this.initialRoll * damageMultiplier + this.totalMods();
  }

  // eslint-disable-next-line class-methods-use-this
  wasCritFail() {
    return false;
  }

  /**
   * Damage criticals come from the `dmg` marker modifier (2+ dice at max, by default).
   *
   * @override
   * @returns {Boolean}
   */
  wasCritSuccess() {
    const term = this.dice[0];
    return !!term && term.options.cprDamageIsCrit === true;
  }

  setAutofire() {
    this.isAutofire = true;
    this.terms = this.constructor.parse("2d6dmg", this.data);
    this.die = "d6";
  }

  configureAutofire(
    autofireMultiplier,
    autofireMultiplierMax = 0,
    ammoOverride,
  ) {
    this.autofireMultiplier = autofireMultiplier;
    if (ammoOverride?.mode === "set") {
      this.autofireMultiplierMax = ammoOverride.value;
    } else if (ammoOverride?.mode === "modify") {
      this.autofireMultiplierMax = Math.max(
        autofireMultiplierMax + ammoOverride.value,
        ammoOverride.minimum,
      );
    } else if (autofireMultiplierMax > this.autofireMultiplierMax) {
      this.autofireMultiplierMax = autofireMultiplierMax;
    }
  }

  setNetCombat(rollTitle) {
    this.rollTitle = rollTitle;
    this.rollPrompt = `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-program-damage-prompt.hbs`;
    this.rollCard = `systems/${game.system.id}/templates/chat/cpr-program-damage-rollcard.hbs`;
  }
}

/**
 * Wrapper for a roll already made on a RollTable (e.g. critical injuries).
 */
export class CPRTableRoll extends CPRRoll {
  static create(rollTitle, tableRoll, rollCard) {
    const { evalFormula, cprState } = CPRRoll.buildState(
      tableRoll._formula,
      "",
      { rollTitle, rollCard },
    );
    cprState.faces = tableRoll.terms[0].results.map((die) => die.result);
    cprState.resultTotal = tableRoll.result;
    cprState.initialRoll = tableRoll.total;
    const roll = new CPRTableRoll(evalFormula, {}, { cprState });
    roll._tableRoll = tableRoll;
    return roll;
  }
}

export const rollTypes = {
  BASE: "base",
  STAT: "stat",
  SKILL: "skill",
  HUMANITY: "humanity",
  ROLEABILITY: "roleAbility",
  ATTACK: "attack",
  AIMED: "aimed",
  AUTOFIRE: "autofire",
  SUPPRESSIVE: "suppressive",
  DAMAGE: "damage",
  DEATHSAVE: "deathsave",
  LUCKROLL: "luckroll",
  INTERFACEABILITY: "interfaceAbility",
  CYBERDECKPROGRAM: "cyberdeckProgram",
  FACEDOWN: "facedown",
};
