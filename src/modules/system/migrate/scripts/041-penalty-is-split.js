/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";

/**
 * Armour penalties used to be stored as negative integers (eg: -4)
 * this was changed during the DataModel work to use positive integers.
 */
export default class ArmorPenaltyMigrationSplit extends BaseMigrationScript {
  static version = 41;

  static name = "Item: Armor Penalty Migration Split Into REF, DEX and Move";

  static documentFilters = {
    Item: { types: ["armor"], mixins: [] },
    Actor: { types: [], mixins: [] },
  };

  async updateItem(doc) {
    console.log("UPDATING ARMOR DOC: ", doc);
    if (Number.isInteger(doc.system.penalty)) {
        console.log("has penalty!", doc.system.penalty);
      doc.system.penalty = {
        ref: Math.abs(doc.system.penalty),
        dex: Math.abs(doc.system.penalty),
        move: Math.abs(doc.system.penalty)
      }

        console.log("new penalty!", doc.system.penalty)
    }
  }
}