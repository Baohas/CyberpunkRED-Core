/* globals foundry */

import LOGGER from "../../../utils/cpr-logger.js";

export default class UpgradableSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | UpgradableSchema | called.");
    const { fields } = foundry.data;
    return {
      upgrades: new fields.ArrayField(
        new fields.StringField({
          blank: true,
        })
      ),
      isUpgraded: new fields.BooleanField({ initial: false }),
    };
  }
}
