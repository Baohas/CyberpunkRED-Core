/* globals FormApplication mergeObject $ duplicate getProperty setProperty hasProperty */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Form application to handle dialogs more generally.
 */
export default class CPRDialog extends FormApplication {
  constructor(rollData, actor, item, options) {
    LOGGER.trace("constructor | CPRDialog | Called.");
    super(rollData, options);
    this.rollData = rollData;
    this.object = rollData;
    this.dialogData = {
      aimedAttack: false,
    };
    this.actor = actor;
    this.item = item;
  }

  /**
   * Set default options for the ledger.
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @static
   * @override
   */
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | CPRDialog | called.");
    return mergeObject(super.defaultOptions, {
      template: "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-universal-roll-prompt.hbs",
      width: "auto",
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: false,
    });
  }

  getData() {
    LOGGER.trace("getData | CPRDialog | called.");
    const data = super.getData();
    data.rollData = this.rollData; // CPRRoll object
    data.item = this.item;
    data.dialogData = this.dialogData;

    // Get effects relevant to the roll.
    const effects = this.actor.effects.contents;
    const filteredEffects = [];

    // Skill Effects.
    const skillEffects = effects.filter((e) => e.changes.some((c) => c.key === `bonuses.${SystemUtils.slugify(this.rollData.skillName)}`));
    skillEffects.forEach((e) => filteredEffects.push(e));

    const combatEffects = [];
    data.activeEffects = filteredEffects;
    return data;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRDialog | Called.");
    super.activateListeners(html);
    if (!this.options.editable) return;

    // Select all text when grabbing text input.
    $("input[type=text]").focusin(() => $(this).select());
    $("input[type=number]").focusin(() => $(this).select());

    // generic listeners
    html.find(".item-checkbox").click((event) => this._itemCheckboxToggle(event));
    html.find(".confirm-roll").click(() => this.confirmRoll());
    html.find(".cancel-roll").click(() => this.close());

    super.activateListeners(html);
  }

  _itemCheckboxToggle(event) {
    LOGGER.trace("_itemCheckboxToggle | CPRDialog | Called.");
    const { rollData } = this;
    const { dialogData } = this;
    const target = SystemUtils.GetEventDatum(event, "data-target");
    const meta = (/true/i).test(SystemUtils.GetEventDatum(event, "data-meta"));
    const changeData = meta ? dialogData : rollData;
    const value = !getProperty(changeData, target);
    if (hasProperty(changeData, target)) {
      setProperty(changeData, target, value);
      // this._automaticResize(); // Resize the sheet as length of settings list might have changed
    }
  }

  /**
   * This will confirm the roll and resolve the Promise originally created when CPRDialog.showDialog is called.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   */
  async confirmRoll(options) {
    LOGGER.trace("confirmRoll | CPRDialog | Called.");
    /** Taken from Starfinder: Fire callback, then delete, as it would get called again by Dialog#close. '
       * Do I need to do this though, since it does not have the same name? Seems like it works without it.
       */

    // if (this.options.confirmRoll) {
    //   this.options.confirmRoll();
    //   delete this.options.confirmRoll;
    // }

    this.options.confirmRoll();
    return this.close(options);
  }

  /**
   * Creates a promise to be resolved when the dialog is confirmed. One can also override default options here.
   *
   * @param {CPRRoll} - Roll to be modified by the dialog.
   */
  static async showDialog(cprRoll, actor, item) {
    LOGGER.trace("showDialog | CPRDialog | Called.");
    return new Promise((resolve) => {
      const dialog = new CPRDialog(cprRoll, actor, item, {
        confirmRoll: () => resolve(cprRoll),
        title: cprRoll.rollTitle,
      });
      dialog.render(true);
    });
  }

  /**
   * Foundry provides this function, which is necessary to override for FormApplications.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   * @param {CPRRoll} formData - Roll data to be merged with the original CPRRoll.
   * @override
   */
  async _updateObject(event, formData) {
    LOGGER.trace("_updateObject | CPRDialog | Called.");
    const fd = duplicate(formData);
    if (formData.mods) {
      fd.mods = fd.mods.replace(/ +/g, ",");
      fd.mods = fd.mods.replace(/,+/g, ",");
      fd.mods = fd.mods.split(",").map(Number);
    } else {
      fd.mods = [];
    }

    // If aimedAttack isn't selected, default to body.
    if (!formData.aimedAttack) {
      fd.location = "body";
    }

    switch (formData.constructor.name) {
      case "CPRDamageRoll":
      case "CPRAttackRoll": {
        if (formData.autofire) {
          fd.fireMode = "autofire";
        }
        if (formData.suppressive) {
          fd.fireMode = "suppressive";
        }
        break;
      }
      default:
    }

    mergeObject(this.rollData, fd);
    this.render(true); // rerenders the FormApp with the new data.
  }
}
