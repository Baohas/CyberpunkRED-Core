/* globals */

import LOGGER from "../../../utils/cpr-logger.js";
import CPRSystemDataModel from "../../abstract.js";
import InstalledItemsSchema from "../../shared/installedItems-schema.js";

export default class ContainerSchema extends CPRSystemDataModel.mixin(
  InstalledItemsSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | CommonSchema | called.");
    return this.mergeSchema(super.defineSchema(["itemUpgrades"], true), {});
  }
}
