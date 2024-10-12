import LOGGER from "../../../utils/cpr-logger.js";

export default class LifestyleSchema extends foundry.abstract.DataModel {
  /**
   * Programatically produce schema object for lifestyle options.
   *
   * @param {Boolean} options.includeCost - Whether or not to include cost field in final object.
   * @param {number} options.initialCost- Initial value for cost
   * @param {string} options.initialDescription - initial value for description
   * @returns {Object} Foundry schema object with schema fields defined.
   */
  static defineSchema({
    includeCost = true,
    initialCost,
    initialDescription,
  } = {}) {
    LOGGER.trace("defineSchema | LifestyleSchema | called.");
    if (includeCost) {
      return {
        ...this.cost(initialCost),
        ...this.description(initialDescription),
      };
    }

    return { ...this.description(initialDescription) };
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  static cost(initial) {
    const { fields } = foundry.data;
    return {
      cost: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: initial ?? 0,
        min: 0,
      }),
    };
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  static description(initial) {
    const { fields } = foundry.data;
    return {
      description: new fields.HTMLField({ initial: initial ?? "" }),
    };
  }
}
