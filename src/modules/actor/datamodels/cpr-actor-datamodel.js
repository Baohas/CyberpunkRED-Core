/* globals foundry */

import LOGGER from "../../utils/cpr-logger.js";
import DerivedStatsSchema from "./cpr-derivedStats-datamodel.js";

export default class CPRActorDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    LOGGER.trace("defineSchema | CPRActor | called.");
    const { fields } = foundry.data;
    return {
      derivedStats: new fields.SchemaField({
        ...DerivedStatsSchema.defineSchema(),
      }),
      externalData: new fields.SchemaField({
        currentArmorBody: new fields.SchemaField({
          id: new fields.DocumentIdField(),
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
          max: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
        }),
        currentArmorHead: new fields.SchemaField({
          id: new fields.DocumentIdField(),
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
          max: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
        }),
        currentArmorShield: new fields.SchemaField({
          id: new fields.DocumentIdField(),
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
          max: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
        }),
        currentWeapon: new fields.SchemaField({
          id: new fields.DocumentIdField(),
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
          max: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            positive: false,
            initial: 0,
            min: 0,
          }),
        }),
      }),
      improvementPoints: new fields.SchemaField({
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
          initial: 0,
        }),
      }),
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
        extras: new fields.SchemaField({
          cost: new fields.NumberField({
            required: true,
            nullable: false,
            integer: false,
            initial: 100,
            positive: false,
          }),
          description: new fields.HTMLField(),
        }),
        fashion: new fields.SchemaField({
          desription: new fields.HTMLField(),
        }),
        housing: new fields.SchemaField({
          desription: new fields.HTMLField({ initial: "Cargo Container" }),
          cost: new fields.NumberField({
            required: true,
            nullable: false,
            integer: false,
            initial: 1000,
            positive: false,
          }),
        }),
        lifeStyle: new fields.SchemaField({
          desription: new fields.HTMLField({ initial: "Kibble" }),
          cost: new fields.NumberField({
            required: true,
            nullable: false,
            integer: false,
            initial: 100,
            positive: false,
          }),
        }),
        traumaTeam: new fields.SchemaField({
          desription: new fields.HTMLField({ initial: "" }),
          cost: new fields.NumberField({
            required: true,
            nullable: false,
            integer: false,
            initial: 0,
            positive: false,
          }),
        }),
      }),
      reputation: new fields.SchemaField({
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
          initial: 0,
        }),
      }),
      roleInfo: new fields.SchemaField({
        activeNetRole: new fields.StringField({
          required: true,
          blank: true,
        }),
        activeRole: new fields.StringField({
          required: true,
          blank: true,
        }),
      }),
      stats: new fields.SchemaField({
        body: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        cool: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        dex: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        emp: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
          max: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        int: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        luck: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
          max: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        move: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        ref: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        tech: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
        will: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 6,
            min: 0,
          }),
        }),
      }),
      wealth: new fields.SchemaField({
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
          initial: 0,
        }),
      }),
    };
  }

  get seriouslyWounded() {
    LOGGER.trace("seriouslyWounded");
    return Math.ceil(this.parent.system.hp.max / 2);
  }
}
