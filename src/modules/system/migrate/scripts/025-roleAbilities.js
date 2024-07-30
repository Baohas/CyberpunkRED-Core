/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class RoleAbilityNaNMigration extends BaseMigrationScript {
  static version = 25;

  static name = "Role - NaN Multiplier";

  static documentFilters = {
    Item: { none: false, types: ["role"], mixins: [] },
    Actor: { none: false, types: [], mixins: [] },
  };

  async updateItem(doc) {
    LOGGER.trace("updateItem | Test Migration");
    const nanAbilities = doc.system.abilities.filter((a) =>
      Number.isNaN(a.multiplier)
    );
    for (const ability of nanAbilities) {
      ability.multiplier = 1;
    }
  }
}
