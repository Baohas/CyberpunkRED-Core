import LOGGER from "../../../utils/cpr-logger.js";
import CPR from "../../../system/config.js";

export default class QualitySchema extends foundry.abstract.DataModel {
  static mixinName = "quality";

  static defineSchema() {
    LOGGER.trace("defineSchema | QualitySchema | called.");
    const { fields } = foundry.data;
    return {
      quality: new fields.StringField({
        initial: "standard",
        choices: Object.keys(CPR.itemQuality),
      }),
    };
  }
}
