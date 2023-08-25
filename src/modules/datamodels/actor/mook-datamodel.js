import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";

export default class MookDataModel extends CPRSystemDataModel.mixin(
  CommonSchema
) {}
