/* globals TokenDocument, CONFIG */
import LOGGER from "../utils/cpr-logger.js";

export default class CPRToken extends TokenDocument {
  static getTrackedAttributes(data, _path = []) {
    LOGGER.trace("getTrackedAttributes | CPRToken | Called.");
    const attributes = super.getTrackedAttributes(data, _path);
    if (_path.length) return attributes;
    const allowed = CONFIG.CPR.trackableAttributes;
    attributes.value = attributes.value.filter((attrs) => this._isAllowedAttribute(allowed, attrs));
    return attributes;
  }

  /**
   * Traverse the configured allowed attributes to see if the provided one matches.
   * @param {object} allowed  The allowed attributes structure.
   * @param {string[]} attrs  The attributes list to test.
   * @returns {boolean}       Whether the given attribute is allowed.
   * @private
   */
  static _isAllowedAttribute(allowed, attrs) {
    LOGGER.trace("_isAllowedAttribute | CPRToken | Called.");
    let allow = allowed;
    for (const attr of attrs) {
      if (allow === undefined) return false;
      if (allow === true) return true;
      if (allow["*"] !== undefined) allow = allow["*"];
      else allow = allow[attr];
    }
    return allow !== undefined;
  }
}
