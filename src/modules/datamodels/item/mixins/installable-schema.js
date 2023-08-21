/* globals foundry */

import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";
import InstalledItemsSchema from "../../shared/installedItems-schema.js";

export default class InstallableSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | InstallableSchema | called.");
    const { fields } = foundry.data;
    return {
      installLocation: new fields.StringField({
        initial: "mall",
        choices: Object.keys(CPR.cyberwareInstallList),
      }),
      installedIn: new fields.DocumentIdField({ blank: true }),
      isInstalled: new fields.BooleanField({ initial: false }),
      size: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
    };
  }

  static migrateData(source) {
    LOGGER.trace("migrateData");
    // eslint-disable-next-line no-param-reassign
    source.installedIn = InstalledItemsSchema.migrateItemUuid(
      source.installedIn
    );
    return super.migrateData(source);
  }
}
