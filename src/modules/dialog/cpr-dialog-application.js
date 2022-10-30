/* globals FormApplication mergeObject $ duplicate getProperty setProperty hasProperty */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Form application to handle dialogs more generally.
 */
export default class CPRDialog extends FormApplication {
  constructor(rollData, options) {
    LOGGER.trace("constructor | CPRDialog | Called.");
    super(rollData, options);
    this.rollData = rollData;
    this.object = rollData;
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
      submitOnClose: true,
    });
  }

  getData() {
    LOGGER.trace("getData | CPRDialog | called.");
    const data = super.getData();
    data.rollData = this.rollData;
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

    super.activateListeners(html);
  }

  _itemCheckboxToggle(event) {
    LOGGER.trace("_itemCheckboxToggle | CPRDialog | Called.");
    const { rollData } = this;
    const target = SystemUtils.GetEventDatum(event, "data-target");
    const value = !getProperty(rollData, target);
    if (hasProperty(rollData, target)) {
      setProperty(rollData, target, value);
      // this._automaticResize(); // Resize the sheet as length of settings list might have changed
    }
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  async close(options) {
    /** Taken from Starfinder: Fire callback, then delete, as it would get called again by Dialog#close. */
    if (this.options.close) {
      this.options.close();
      delete this.options.close;
    }
    return super.close(options);
  }

  static async verifyRoll(cprRoll) {
    LOGGER.trace("verifyRoll | CPR Dialog | Called.");
    return new Promise((resolve) => {
      const dlg = new CPRDialog(cprRoll, {
        close: () => resolve(cprRoll),
        title: cprRoll.rollTitle,
      });
      dlg.render(true);
    });
  }

  // eslint-disable-next-line no-unused-vars, foundry-cpr/logger-after-function-definition
  async _updateObject(event, formData) {
    const fd = duplicate(formData);
    if (formData.mods) {
      fd.mods = fd.mods.replace(/ +/g, ",");
      fd.mods = fd.mods.replace(/,+/g, ",");
      fd.mods = fd.mods.split(",").map(Number);
    } else {
      fd.mods = [];
    }
    mergeObject(this.rollData, fd);
    this.render(true); // rerenders the FormApp with the new data.
  }
}
