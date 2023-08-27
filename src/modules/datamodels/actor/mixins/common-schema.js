/* globals foundry */

import LOGGER from "../../../utils/cpr-logger.js";
import StatSchema from "../components/stat-schema.js";
import DerivedStatsSchema from "../components/derivedStats-schema.js";
import ExternalResourceSchema from "../components/external-resource-schema.js";
import LedgerSchema from "../components/ledger-schema.js";

export default class CommonSchema extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | CommonSchema | called.");
    const { fields } = foundry.data;
    const hasMax = true;
    return {
      stats: new fields.SchemaField({
        body: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
        cool: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
        dex: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
        emp: new fields.SchemaField(StatSchema.defineSchema(hasMax)),
        int: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
        luck: new fields.SchemaField(StatSchema.defineSchema(hasMax)),
        move: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
        ref: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
        tech: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
        will: new fields.SchemaField(StatSchema.defineSchema(!hasMax)),
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
