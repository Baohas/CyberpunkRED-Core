/* eslint-disable foundry-cpr/logger-after-function-definition */

import CPRMigration from "../cpr-migration.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class dvCompendiumMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | dvCompendium Migration");
    super();
    this.version = 15;
    this.name = "dvCompendium Migration";
  }

  /**
   * Executed before the migration takes place, see run() in the base migration class.
   */
  async preMigrate() {
    LOGGER.trace(`preMigrate | ${this.version}-${this.name}`);
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
  static async migrateItem(item) {
    LOGGER.debug(`migrateItem | ${this.version}-${this.name}`);
  }

  /**
   * Simply make sure owned items are updated too.
   *
   * @param {CPRActor} actor
   */
  async migrateActor(actor) {
    LOGGER.trace(`migrateActor | ${this.version}-${this.name}`);
    // Abusing this to update the game setting
    // Tried for a few hours to add a `migrateSetting` function
    const settingName = "dvRollTableCompendium";
    const newValue = `${game.system.id}.dv-tables`;
    const oldValue = `${game.system.id}.dvTables`;
    const currentValue = game.settings.get(game.system.id, settingName);

    if (currentValue === oldValue) {
      LOGGER.trace(`migrateSettings | Updating ${settingName} to ${newValue}`);
      return game.settings.set(game.system.id, settingName, newValue);
    }
    for (const item of actor.items) {
      // eslint-disable-next-line no-await-in-loop
      const updateData = await PackIconMigration.migrateItem(item);
      if (updateData !== null) itemUpdates.push(updateData);
    }
    return actor.updateEmbeddedDocuments("Item", itemUpdates);
  }
}
