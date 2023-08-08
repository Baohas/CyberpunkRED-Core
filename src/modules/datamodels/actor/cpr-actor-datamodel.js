/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import DerivedStatsSchema from "./components/cpr-derivedStats-datamodel.js";
import ExternalResourceSchema from "./components/cpr-external-resource-datamodel.js";
import LedgerSchema from "./components/cpr-ledger-datamodel.js";
import StatSchema from "./components/cpr-stat-datamodel.js";
import LifestyleSchema from "./components/cpr-lifestyle-datamodel.js";

export default class CPRActorDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | CPRActor | called.");
    const { fields } = foundry.data;
    return {
      derivedStats: new fields.SchemaField(DerivedStatsSchema.defineSchema()),
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
      improvementPoints: new fields.SchemaField(LedgerSchema.defineSchema()),
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
      lifepath: new fields.SchemaField({
        aboutPeople: new fields.HTMLField({ initial: "" }),
        affectations: new fields.HTMLField({ initial: "" }),
        childhoodEnvironment: new fields.HTMLField({ initial: "" }),
        clothingStyle: new fields.HTMLField({ initial: "" }),
        culturalOrigin: new fields.HTMLField({ initial: "" }),
        enemies: new fields.HTMLField({ initial: "" }),
        familyBackground: new fields.HTMLField({ initial: "" }),
        familyCrisis: new fields.HTMLField({ initial: "" }),
        friends: new fields.HTMLField({ initial: "" }),
        hairStyle: new fields.HTMLField({ initial: "" }),
        lifeGoals: new fields.HTMLField({ initial: "" }),
        personality: new fields.HTMLField({ initial: "" }),
        roleLifepath: new fields.HTMLField({ initial: "" }),
        tragicLoveAffairs: new fields.HTMLField({ initial: "" }),
        valueMost: new fields.HTMLField({ initial: "" }),
        valuedPerson: new fields.HTMLField({ initial: "" }),
        valuedPossession: new fields.HTMLField({ initial: "" }),
      }),
      lifestyle: new fields.SchemaField({
        extras: new fields.SchemaField(
          LifestyleSchema.defineSchema(true, {
            initialCost: 100,
          })
        ),
        fashion: new fields.SchemaField({
          desription: new fields.HTMLField(),
        }),
        housing: new fields.SchemaField(
          LifestyleSchema.defineSchema(true, {
            initialCost: 1000,
            initialDescription: "Cargo Container",
          })
        ),
        lifeStyle: new fields.SchemaField(
          LifestyleSchema.defineSchema(true, {
            initialCost: 100,
            initialDescription: "Kibble",
          })
        ),
        traumaTeam: new fields.SchemaField(LifestyleSchema.defineSchema(true)),
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
      wealth: new fields.SchemaField(LedgerSchema.defineSchema()),
    };
  }

  get seriouslyWounded() {
    LOGGER.trace("seriouslyWounded");
    return Math.ceil(this.parent.system.derivedStats.hp.max / 2);
  }
}
