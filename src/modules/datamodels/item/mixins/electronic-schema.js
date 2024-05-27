import LOGGER from "../../../utils/cpr-logger.js";

export default class ElectronicSchema extends foundry.abstract.DataModel {
  static mixinName = "electronic";

  static defineSchema() {
    LOGGER.trace("defineSchema | ElectronicSchema | called.");
    const { fields } = foundry.data;
    return {
      isElectronic: new fields.BooleanField({ initial: false }),
      providesHardening: new fields.BooleanField({ initial: false }),
    };
  }
}
