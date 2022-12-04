/* globals game FormApplication mergeObject $ duplicate getProperty setProperty hasProperty */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Form application to handle dialogs more generally.
 */
export default class CPRDialog extends FormApplication {
  constructor(dialogData, options) {
    LOGGER.trace("constructor | CPRDialog | Called.");
    super(dialogData, options);
    this.objectData = dialogData.object;
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
      template: `systems/${game.system.id}/templates/dialog/rolls/cpr-base-verify-roll-prompt.hbs`,
      title: "CPR.global.generic.title",
      width: "auto",
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: false,
    });
  }

  /**
   * Prepares data for roll dialog sheet.
   *
   * @override
   */
  getData() {
    LOGGER.trace("getData | CPRDialog | called.");
    const data = super.getData();
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

    html.find(".item-checkbox").click((event) => this._itemCheckboxToggle(event)); // Currently unused, see below.
    html.find(".confirm-roll").click((event) => this.confirmDialog(event));
    html.find(".cancel-roll").click((event) => this.closeDialog(event));
    this.element.find(".header-button.close").click((event) => this.closeDialog(event));
  }

  /**
   * This works in the same way it does on the item sheets.
   * It can turn anything into a pseudo checkbox, which look nicer than the default ones.
   *
   * @param {*} event
   */
  _itemCheckboxToggle(event) {
    LOGGER.trace("_itemCheckboxToggle | CPRDialog | Called.");
    const dialogData = this.object;
    const target = SystemUtils.GetEventDatum(event, "data-target");
    const value = !getProperty(dialogData, target);
    if (hasProperty(dialogData, target)) {
      setProperty(dialogData, target, value);
    }
    this.render();
  }

  /**
   * This will confirm the roll and resolve the Promise originally created when CPRDialog.showDialog is called.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   */
  async confirmDialog(event, options) {
    LOGGER.trace("confirmDialog | CPRDialog | Called.");
    // Taken from Starfinder: Fire callback that resolves original promise.
    this.options.confirmDialog();
    return this.close(options);
  }

  /**
   * This will cancel/close the roll and reject the Promise originally created when CPRDialog.showDialog is called.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   */
  async closeDialog(event, options) {
    LOGGER.trace("closeDialog | CPRDialog | Called.");
    this.options.closeDialog();
    return this.close(options);
  }

  /**
   * Creates a promise to be resolved when the dialog is confirmed. One can also override default options here.
   *
   * @param {Object} - Some object to be modified by the dialog.
   */
  static async showDialog(...args) {
    LOGGER.trace("showDialog | CPRDialog | Called.");
    return new Promise((resolve, reject) => {
      const dialog = new this(...args, {
        confirmDialog: () => resolve(args[0]),
        closeDialog: () => reject(args[0]),
      });
      dialog.render(true);
    });
  }

  /**
   * Foundry provides this function, which is necessary to override for FormApplications.
   *
   * @param {*} event
   * @param {Object} formData - Updated dialog data to be merged with the original object.
   * @override
   */
  async _updateObject(event, formData) {
    LOGGER.trace("_updateObject | CPRDialog | Called.");
    const fd = duplicate(formData);
    mergeObject(this.object, fd);
    this.render(true); // rerenders the FormApp with the new data.
  }
}
