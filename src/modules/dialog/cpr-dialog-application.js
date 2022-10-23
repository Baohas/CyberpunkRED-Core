/* globals FormApplication mergeObject */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Form application to handle dialogs more generally property.
 */
export default class CPRDialog extends FormApplication {
  constructor(rollData) {
    LOGGER.trace("constructor | CPRDialog | Called.");
    super();
    /**
     * Actor data is slightly different depending on whether or not CPRRollRequest is called via socket, or called directly (I am not sure why).
     * CPRRollRequest is called directly when the user making the request is the same as the one that is requested (e.g. rolling attacks against a token you own).
     * Thus, it is important that we know if we are the same user as the origin. This will come up in getData, _onRoll and _useRangedDv.
     */
    this.rollData = rollData;
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
    });
  }

  getData() {
    LOGGER.trace("getData | CPRDialog | called.");
    const data = super.getData();
    data.rollData = this.rollData;
    return data;
  }
}
