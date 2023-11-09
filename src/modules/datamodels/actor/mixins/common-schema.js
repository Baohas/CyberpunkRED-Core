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
      /**
       *  !IMPORTANT!
       *
       *  Do not alphabetise these, we need them in this order to order them
       *  correctly on the character sheet.
       */
      stats: new fields.SchemaField({
        int: new fields.SchemaField(StatSchema.defineSchema()),
        ref: new fields.SchemaField(StatSchema.defineSchema()),
        dex: new fields.SchemaField(StatSchema.defineSchema()),
        tech: new fields.SchemaField(StatSchema.defineSchema()),
        cool: new fields.SchemaField(StatSchema.defineSchema()),
        will: new fields.SchemaField(StatSchema.defineSchema()),
        luck: new fields.SchemaField(StatSchema.defineSchema(hasMax)),
        move: new fields.SchemaField(StatSchema.defineSchema()),
        body: new fields.SchemaField(StatSchema.defineSchema()),
        emp: new fields.SchemaField(StatSchema.defineSchema(hasMax, -10)),
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
