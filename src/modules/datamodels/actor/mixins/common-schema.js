/* globals foundry */

import LOGGER from "../../../utils/cpr-logger.js";
import StatSchema from "../components/cpr-stat-schema.js";
import DerivedStatsSchema from "../components/cpr-derivedStats-schema.js";
import ExternalResourceSchema from "../components/cpr-external-resource-schema.js";
import LedgerSchema from "../components/cpr-ledger-schema.js";

export default class CommonSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | CommonSchema | called.");
    const { fields } = foundry.data;
    return {
      stats: new fields.SchemaField({
        body: new fields.SchemaField(StatSchema.defineSchema()),
        cool: new fields.SchemaField(StatSchema.defineSchema()),
        dex: new fields.SchemaField(StatSchema.defineSchema()),
        emp: new fields.SchemaField(StatSchema.defineSchema(true)),
        int: new fields.SchemaField(StatSchema.defineSchema()),
        luck: new fields.SchemaField(StatSchema.defineSchema(true)),
        move: new fields.SchemaField(StatSchema.defineSchema()),
        ref: new fields.SchemaField(StatSchema.defineSchema()),
        tech: new fields.SchemaField(StatSchema.defineSchema()),
        will: new fields.SchemaField(StatSchema.defineSchema()),
      }),
      externalData: new fields.SchemaField({
        currentArmorBody: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
        currentArmorHead: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
        currentArmorShield: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
        currentWeapon: new fields.SchemaField(
          ExternalResourceSchema.defineSchema()
        ),
      }),
      derivedStats: new fields.SchemaField(DerivedStatsSchema.defineSchema()),
      information: new fields.SchemaField({
        alias: new fields.HTMLField({ initial: "" }),
        description: new fields.HTMLField({ initial: "" }),
        history: new fields.HTMLField({ initial: "" }),
        notes: new fields.HTMLField({ initial: "" }),
      }),
      installedItems: new fields.SchemaField({
        allowed: new fields.BooleanField({ initial: true }),
        allowedTypes: new fields.ArrayField(
          // Can this be blank?
          new fields.StringField({
            required: true,
            blank: true,
            choices: ["cyberware"],
          }),
          { initial: ["cyberware"] }
        ),
        list: new fields.ArrayField(
          new fields.StringField({ required: true, blank: true }),
          { initial: [] }
        ),
      }),
      reputation: new fields.SchemaField(LedgerSchema.defineSchema()),
      roleInfo: new fields.SchemaField({
        activeNetRole: new fields.DocumentIdField({
          required: true,
          blank: true,
        }),
        activeRole: new fields.StringField({
          required: true,
          blank: true,
        }),
      }),
    };
  }
}
