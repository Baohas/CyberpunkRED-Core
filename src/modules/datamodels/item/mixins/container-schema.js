/* globals foundry parseUuid */

import LOGGER from "../../../utils/cpr-logger.js";
import InstalledItemsSchema from "../../shared/installedItems-schema.js";

export default class ContainerSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | ContainerSchema | called.");
    const { fields } = foundry.data;
    return {
      installedItems: new fields.SchemaField(
        InstalledItemsSchema.defineSchema(["itemUpgrade"], true)
      ),
    };
  }

  static migrateData(source) {
    LOGGER.trace("migrateData");
    InstalledItemsSchema.migrateData(source);
    return super.migrateData(source);
  }
}
