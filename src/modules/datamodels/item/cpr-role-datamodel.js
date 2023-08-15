/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";
import CPRSystemDataModel from "../abstract.js";
import CommonSchema from "./mixins/common-schema.js";

export default class ProgramModel extends CPRSystemDataModel.mixin(
  CommonSchema
) {
  static defineSchema() {
    LOGGER.trace("defineSchema | ProgramModel | called.");
    const { fields } = foundry.data;
    return this.mergeSchema(super.defineSchema(), {
      rank: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      mainRoleAbility: new fields.StringField({ initial: "", blank: true }),
      hasRoll: new fields.BooleanField({ initial: false }),
      addRoleAbilityRank: new fields.BooleanField({ initial: false }),
      stat: new fields.StringField({
        initial: "--",
        choices: ["--", ...Object.keys(CPR.statList)],
      }),
      // Create a function for skill choices?
      skill: new fields.StringField({
        initial: "--",
      }),
      bonuses: new fields.ArrayField(new fields.ObjectField()),
      universalBonuses: new fields.ArrayField(
        new fields.StringField({ choices: Object.keys(CPR.universalBonuses) })
      ),
      bonusRatio: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 1,
      }),
      abilities: new fields.ArrayField(new fields.ObjectField()),
      isSituational: new fields.BooleanField({ initial: false }),
      onByDefault: new fields.BooleanField({ initial: false }),
    });
  }
}
