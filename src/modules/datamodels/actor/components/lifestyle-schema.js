import LOGGER from "../../../utils/cpr-logger.js";

export default class LifestyleSchema extends foundry.abstract.DataModel {
  /**
   * Programatically produce schema object for lifestyle options.
   *
   * @param {Boolean} includeCost - Whether or not to include cost field in final object.
   * @param {Object} options -
   *    initialCost: Initial value for cost (Number);
   *    initialDescription: initial value for description (String)
   * @returns {Object} Foundry schema object with schema fields defined.
   */
  static defineSchema(includeCost, options) {
    LOGGER.trace("defineSchema | LifestyleSchema | called.");
    if (includeCost) {
      return {
        ...this.cost(options?.initialCost),
        ...this.description(options?.initialDescription),
      };
    }

    return { ...this.description(options?.initialDescription) };
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
