import LOGGER from "../../../utils/cpr-logger.js";

export default class StatSchema extends foundry.abstract.DataModel {
  /**
   *
   * @param {Boolean} includeMax - whether this stat has a max property or not
   * @param {Number} [min = 0] - what the minimum value should be
   * @returns {Object}
   */
  static defineSchema({ includeMax = false, min = 0 } = {}) {
    LOGGER.trace("defineSchema | StatSchema | called.");
    if (includeMax) {
      return { ...this.valueStat(min), ...this.maxStat };
    }

    return { ...this.valueStat(min) };
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  static valueStat(min) {
    const { fields } = foundry.data;
    return {
      value: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 6,
        min,
      }),
    };
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  static get maxStat() {
    const { fields } = foundry.data;
    return {
      max: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 6,
        min: 0,
      }),
    };
  }
}
