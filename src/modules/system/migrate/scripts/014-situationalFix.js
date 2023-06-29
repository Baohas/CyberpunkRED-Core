/* eslint-disable foundry-cpr/logger-after-function-definition */
/* global game duplicate */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class SituationalFix extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | SituaionalFix");
    super();
    this.version = 12;
    this.name = "Situational HotFix Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace(`preMigrate | ${this.version}-${this.name}`);
    CPRSystemUtils.DisplayMessage(
      "notify",
      CPRSystemUtils.Localize("CPR.migration.effects.beginMigration")
    );
    LOGGER.log(`Starting migration: ${this.name}`);
  }

  /**
   * Takes place after the data migration completes.
   */
  async postMigrate() {
    LOGGER.trace(`postMigrate | ${this.version}-${this.name}`);
    LOGGER.log(`Finishing migration: ${this.name}`);
  }

  /**
   * Here's the real work.
   *
   * @param {CPRItem} item
   */
  static async migrateItem2(item) {
    LOGGER.trace(`migrateItem | ${this.version}-${this.name}`);
    const updateData = duplicate(item);
    if (
      updateData.effects.some(
        (e) => !e.flags[game.system.id].changes.situational
      )
    ) {
      updateData.effects.forEach(async (e) => {
        e.changes.forEach(async (c, i) => {
          if (!e.flags[game.system.id].changes.situational) {
            e.flags[
              `${game.system.id}.changes.situational.${i}.isSituational`
            ] = false;
            e.flags[
              `${game.system.id}.changes.situational.${i}.onByDefault`
            ] = false;
          }
        });
      });
    }

    return item.isOwned ? updateData : item.update(updateData);
  }

  /**
   * Here's the real work.
   *
   * @param {CPRItem} item
   */
  static async migrateItem(item) {
    LOGGER.trace(`migrateItem | ${this.version}-${this.name}`);
    const updateList = this.migrateActiveEffect(item);
    // The following is a workaround that let's us update an active effect on an owned item.
    // One must interact with the array directly, rather than using Foundry's typical API.
    // This is a limitation of Foundry pre-v11.
    return item.update({ effects: updateList });
  }

  /**
   * When an item with an AE is dropped on the actor sheet,
   * a duplicate AE is created directly on the actor.
   * Both need to be updated accordingly.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    for (const item of actor.items) {
      // eslint-disable-next-line no-await-in-loop
      await SituationalFix.migrateItem(item); // Migrate each owned item.
    }

    // Migrate each AE on the actor itself.
    const updateList = SituationalFix.migrateActiveEffect(actor);
    return actor.updateEmbeddedDocuments("ActiveEffect", updateList);
  }

  /**
   * Script that migrates effects from a document (either an actor or item).
   *
   * @param {CPRActor|CPRItem} document
   */
  static migrateActiveEffect(document) {
    const { effects } = document;
    const updateList = [];
    // Iterate over each effect.
    effects.forEach((e) => {
      // `newEffect` will start as a dupe of the original effect. Then we will mutate it with the new data.
      const newEffect = duplicate(e);
      // Iterate over each change on the effect.
      e.changes.forEach((c, i) => {
        const changeFlags = newEffect.flags[game.system.id].changes;
        // If the `situational` flag doesn't exist...
        if (!changeFlags.situational) {
          // Create the correct flag.
          newEffect.flags[game.system.id].changes[`situational.${i}`] = {
            isSituational: false,
            onByDefault: false,
          };
        }
      });
      // Update the list with each new effect.
      updateList.push(newEffect);
    });
    return updateList;
  }
}
