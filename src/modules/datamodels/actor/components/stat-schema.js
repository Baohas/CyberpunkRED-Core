/* globals foundry */

import LOGGER from "../../../utils/cpr-logger.js";

export default class StatSchema extends foundry.abstract.DataModel {
  static defineSchema(includeMax) {
    LOGGER.trace("defineSchema | StatSchema | called.");
    if (includeMax) {
      return { ...this.valueStat, ...this.maxStat };
    }

    return { ...this.valueStat };
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  static get valueStat() {
    const { fields } = foundry.data;
    return {
      value: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 6,
        min: 0,
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
