import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class EquippableSchema extends foundry.abstract.DataModel {
  static mixinName = "equippable";

  static defineSchema() {
    LOGGER.trace("defineSchema | EquippableSchema | called.");
    const { fields } = foundry.data;
    return {
      equipped: new fields.StringField({
        initial: "owned",
        choices: Object.keys(CPR.equipped),
      }),
    };
  }
}
