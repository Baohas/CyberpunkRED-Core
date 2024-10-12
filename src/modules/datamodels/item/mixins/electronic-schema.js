import LOGGER from "../../../utils/cpr-logger.js";

export default class ElectronicSchema extends foundry.abstract.DataModel {
  static mixinName = "electronic";

  /**
   *
   * @param {Object} options
   *  @param {Boolean} options.isElectronic
   *  @param {Boolean} options.providesHardening
   *
   * @returns
   */
  static defineSchema({
    isElectronic = false,
    providesHardening = false,
  } = {}) {
    LOGGER.trace("defineSchema | ElectronicSchema | called.");
    const { fields } = foundry.data;
    return {
      isElectronic: new fields.BooleanField({ initial: isElectronic }),
      providesHardening: new fields.BooleanField({
        initial: providesHardening,
      }),
    };
  }
}
