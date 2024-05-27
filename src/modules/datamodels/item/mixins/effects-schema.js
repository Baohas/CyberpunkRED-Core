import LOGGER from "../../../utils/cpr-logger.js";
import CPR from "../../../system/config.js";

export default class EffectsSchema extends foundry.abstract.DataModel {
  static mixinName = "effects";

  static defineSchema() {
    LOGGER.trace("defineSchema | EffectsSchema | called.");
    const { fields } = foundry.data;
    return {
      revealed: new fields.BooleanField({ initial: true }),
      usage: new fields.StringField({
        initial: "toggled",
        choices: Object.keys(CPR.effectUses),
      }),
    };
  }
}
