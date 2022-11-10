/* globals FormApplication mergeObject $ duplicate getProperty setProperty hasProperty */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Form application to handle dialogs more generally.
 */
export default class CPRDialog extends FormApplication {
  constructor(dialogData, options) {
    LOGGER.trace("constructor | CPRDialog | Called.");
    super(dialogData, options);
    this.dialogData = dialogData;
    this.object = dialogData;
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
    // html.find(".item-checkbox").click((event) => this._itemCheckboxToggle(event));
    html.find(".confirm-roll").click((event) => this.confirmDialog(event));
    html.find(".cancel-roll").click(() => this.close());
  }

  _itemCheckboxToggle(event) {
    LOGGER.trace("_itemCheckboxToggle | CPRDialog | Called.");
    const { dialogData } = this;
    const target = SystemUtils.GetEventDatum(event, "data-target");
    const value = !getProperty(dialogData, target);
    if (hasProperty(dialogData, target)) {
      setProperty(dialogData, target, value);
      // this._automaticResize(); // Resize the sheet as length of settings list might have changed
    }
  }

  /**
   * This will confirm the roll and resolve the Promise originally created when CPRDialog.showDialog is called.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   */
  async confirmDialog(event, options) {
    LOGGER.trace("confirmDialog | CPRDialog | Called.");
    /** Taken from Starfinder: Fire callback, then delete, as it would get called again by Dialog#close. '
       * Do I need to do this though, since it does not have the same name? Seems like it works without it.
       */

    // if (this.options.confirmRoll) {
    //   this.options.confirmRoll();
    //   delete this.options.confirmRoll;
    // }
    // await this._updateObject(event, this.rollData);
    this.options.confirmDialog();
    return this.close(options);
  }

  /**
   * Creates a promise to be resolved when the dialog is confirmed. One can also override default options here.
   *
   * @param {Object} - Some object to be modified by the dialog.
   */
  static async showDialog(Cls, ...args) {
    LOGGER.trace("showDialog | CPRDialog | Called.");
    return new Promise((resolve) => {
      const dialog = new Cls(...args, {
        confirmDialog: () => resolve(args[0]),
      });
      dialog.render(true);
    });
  }

  /**
   * Foundry provides this function, which is necessary to override for FormApplications.
   *
   * @param {Object} options - potential options to pass to this.close; currently unused;
   * @param {Object} formData - Dialog data to be merged with the original CPRRoll.
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

    mergeObject(this.dialogData, fd);
    this.render(true); // rerenders the FormApp with the new data.
  }
}
