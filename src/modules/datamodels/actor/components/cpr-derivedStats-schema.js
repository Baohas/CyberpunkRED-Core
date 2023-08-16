/* globals foundry */

import CPR from "../../../system/config.js";
import LOGGER from "../../../utils/cpr-logger.js";
import HpSchema from "./cpr-hp-schema.js";

export default class DerivedStatsSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | DerivedStatsSchema | called.");
    const { fields } = foundry.data;
    return {
      currentWoundState: new fields.StringField({
        choices: Object.keys(CPR.woundState),
      }),
      deathSave: new fields.SchemaField({
        basePenalty: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
        penalty: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 0,
          min: 0,
        }),
      }),
      hp: new fields.SchemaField(HpSchema.defineSchema()),
      humanity: new fields.SchemaField({
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 60,
          min: 0,
        }),
        transactions: new fields.ArrayField(
          new fields.ArrayField(
            new fields.StringField({ required: true, blank: true })
          )
        ),
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 60,
          min: 0,
        }),
      }),
      run: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 24,
          min: 0,
        }),
      }),
      seriouslyWounded: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        positive: false,
        initial: 20,
        min: 0,
      }),
      walk: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          positive: false,
          initial: 12,
          min: 0,
        }),
      }),
    };
  }
}
