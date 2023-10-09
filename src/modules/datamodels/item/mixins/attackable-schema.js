/* globals foundry */

import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class AttackableSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | AttackableSchema | called.");
    const { fields } = foundry.data;
    return {
      weaponType: new fields.StringField({
        blank: true,
        choices: Object.keys(CPR.weaponTypeList),
      }),
      weaponSkill: new fields.StringField({
        blank: true,
        // Write function for choices:
      }),
      fireModes: new fields.SchemaField({
        autoFire: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          initial: 0,
          min: 0,
        }),
        suppressiveFire: new fields.BooleanField({ initial: false }),
      }),
      damage: new fields.StringField({ initial: "1d6" }),
      rof: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
      dvTable: new fields.StringField({ blank: true }),
      isRanged: new fields.BooleanField({ initial: false }),
      unarmedAutomaticCalculation: new fields.BooleanField({ initial: true }),
      attackmod: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),
      critFailEffect: new fields.StringField({
        required: true,
        initial: "jammed",
        choices: Object.keys(CPR.attackableCritFailEffects),
      }),
    };
  }
}
