/* globals FormApplication mergeObject $ duplicate getProperty setProperty hasProperty */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Form application to handle dialogs more generally.
 */
export default class CPRDialog extends FormApplication {
  constructor(rollData) {
    LOGGER.trace("constructor | CPRDialog | Called.");
    super(rollData, { title: rollData.rollTitle });
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
      title: `Roll Confirmation for...`,
      template: "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-universal-roll-prompt.hbs",
      width: "auto",
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false,
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
      // this.update(rollData);
      // LOGGER.log(`Item ${this.item.id} ${target} set to ${value}`);
      // this._automaticResize(); // Resize the sheet as length of settings list might have changed
    }
  }

  static async verifyRoll() {
    LOGGER.trace("verifyRoll | CPR Dialog | Called.");
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  // eslint-disable-next-line no-unused-vars, foundry-cpr/logger-after-function-definition
  async _updateObject(event, formData) {
    mergeObject(this.rollData, formData);
    this.render(true); // rerenders the FormApp with the new data.
    return true;
  }
}
