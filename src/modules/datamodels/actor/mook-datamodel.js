import LOGGER from "../../utils/cpr-logger.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";

export default class MookDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ContainerSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | CommonSchema | called.");
    return this.mergeSchema(
      super.defineSchema({
        initialAllowedTypes: ["cyberware"],
        includeSlots: false,
      }),
      {}
    );
  }
}
