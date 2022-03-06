/* global duplicate */

import CPRMigration from "../cpr-migration.js";
import CPRSystemUtils from "../../../utils/cpr-systemUtils.js";
import LOGGER from "../../../utils/cpr-logger.js";

export default class ActiveEffectsMigration extends CPRMigration {
  constructor() {
    LOGGER.trace("constructor | 1-activeEffects Migration");
    super();
    this.version = 1;
  }

  /**
   * The actors were updated in 2 ways.
   *    Universal Attack Bonus and Damage --> corresponding AE
   *    Deleted skill and role properties.
   *
   * @async
   * @static
   * @param {CPRActor} actor
   */
  static async updateActor(actor) {
    LOGGER.trace("updateActor | 1-activeEffects Migration");
    // const newActor = actor;
    if (!(actor.data.type === "character" || actor.data.type === "mook")) return;
    const updateData = {};
    if (actor.data.data.universalBonuses.attack !== 0) {
      const name = CPRSystemUtils.Localize("CPR.migration.effects.attackName");
      await ActiveEffectsMigration.addActorEffect(actor, name, "combat", "bonuses.universalAttack", actor.data.data.universalBonuses.attack);
    }
    if (actor.data.data.universalBonuses.damage !== 0) {
      const name = CPRSystemUtils.Localize("CPR.migration.effects.damageName");
      await ActiveEffectsMigration.addActorEffect(actor, name, "combat", "bonuses.universalDamage", actor.data.data.universalBonuses.damage);
    }

    // Deleting properties requires this special Foundry-specific magic. You create additional properties with "-=" appended
    // to the end, and the update() interprets that as, "delete the property with the same name but without the '-=' part."
    // Using delete or setting existing properties to null produces errors from update().
    updateData["data.-=skills"] = null;
    updateData["data.roleInfo.-=roles"] = null;
    updateData["data.roleInfo.-=roleskills"] = null;
    updateData["data.-=universalBonuses"] = null;
    await actor.update(updateData);

    // finally, migrate their owned items
    for (const ownedItem of actor.items) ActiveEffectsMigration.updateItem(ownedItem);
  }

  /**
   * Mutator that adds an active effect to the given actor. The name, key (stat), and value must also be provided.
   * Used when arbitrary mods are discovered on an actor and they must be preserved as AEs going forward.
   * This assumes exactly 1 change for the effect!
   *
   * @param {CPRActor} actor
   * @param {String} effectName - (hopefully localized) name for the active effect
   * @param {String} effectKey - dot-notation key of the stat being changed (see GetEffectModifierMap in cpr-systemUtils.js)
   * @param {Number} effectValue - how much the key is being changed by
   * @returns {CPRActiveEffect}
   */
  static async addActorEffect(actor, effectName, effectCat, effectKey, effectValue) {
    LOGGER.trace("addActorEffect | 1-activeEffects Migration");
    const [effect] = await actor.createEffect();
    actor.updateEmbeddedDocuments("ActiveEffect", [{
      _id: effect.id,
      label: effectName,
      changes: [{
        key: effectKey,
        mode: 2,
        value: effectValue,
        priority: effect.data.changes.length,
      }],
      "flags.cyberpunk-red-core.changes.0": effectCat,
    }]);
  }

  /**
   * Items changed in so many ways it seemed best to break out a separate migration
   * path for each item type. Here's the complete of changes in psuedocode of what
   * remains to be done.
   *  Clothing
   *    Gained slots for upgrades
   *    if price is 0 and category is empty, set to 100/premium
   *    if type is empty set to jacket
   *    if style is empty set to genericChic
   *  Cyberware
   *    Migrate Upgrades
   *    Lost charges
   *    Gained slots for upgrades
   *    if price is 0 and category is empty, set to 100/premium
   *  Cyberdeck
   *    Lost quality
   *    Gained slots for upgrades
   *    if price is 0 and category is empty, set to 100/premium
   *  Drugs - Newly introduced, no migration needed
   *  Gear
   *    Lost quality
   *    Gained slots for upgrades
   *    if price is 0 and category is empty, set to 100/premium
   *  NetArch
   *    Lost quality
   *    Lost amount - create duplicate items
   *    if price is 0 and category is empty, set to 100/premium
   *  Program
   *    Lost quality
   *    Lost amount - create duplicate items
   *    "modifiers" property converted to AEs
   *    Lost slots - whoops?
   *    if price is 0 and category is empty, set to 100/premium
   *    Lost isDemon
   *  Skill:
   *    "skillmod" property converted to AEs
   *  Role:
   *    "skillBonuses" became "bonuses"
   *  CriticalInjury
   *    Add new AEs to model stat/skill effects
   *    No data model changes though.
   *  Vehicle
   *    Lost quality
   *    Lost ammount - create duplicate items
   *    Gained slots for upgrades
   *    if price is 0 and category is empty, set to 100/premium
   *  itemUpgrades
   *    Lost quality
   *    Lost amount - create duplicate items
   *    Lost charges
   *    confirm how upgrades and slots work
   *    modifiers.secondaryWeapon.configured = false if not already defined
   *    if price is 0 and category is empty, set to 100/premium
   *  Weapon
   *    Lost quality - "excellent" should become an AE for Universal Attack
   *    Lost amount - create duplicate items
   *    Lost charges
   *    Gained slots for upgrades (attachmentSlots became slots)
   *
   * TODO: is this just the item directory, or does it include or owned items?
   * TODO: understand how upgrade slots work for different item types
   *       this was originally in a case statement in the item code, now split per-type
   *       can subclasses override a function provided by the upgradeable mixin?
   *
   * @param {CPRItem} item
   */
  static updateItem(item) {
    LOGGER.trace("updateItem | 1-activeEffects Migration");
    switch (item.type) {
      case "ammo":
        ActiveEffectsMigration.updateAmmo(item);
        break;
      case "armor":
        ActiveEffectsMigration.updateArmor(item);
        break;
      default:
        LOGGER.warn(`An unrecognized item type was ignored: ${item.type}. It was not migrated!`);
    }
  }

  /**
   * Here's what changed with Ammo:
   *    Lost quality
   *    Lost upgradeable properties
   *    Gained concealable
   *    if price is 0 and category is empty, set to 100/premium
   *    if variety is empty set to heavyPistol
   *    if type is empty set to basic
   * @param {CPRItem} item
   */
  static async updateAmmo(ammo) {
    LOGGER.trace("updateAmmo | 1-activeEffects Migration");
    const updateData = {};
    updateData["data.-=quality"] = null;
    updateData["data.-=isUpgraded"] = null;
    updateData["data.-=upgrades"] = null;
    updateData["data.concealable"] = {
      concealable: true,
      isConcealed: false,
    };
    if (ammo.data.data.price.market === 0 && ammo.data.data.price.category === "") {
      updateData["data.price.market"] = 100;
      updateData["data.price.category"] = "premium";
    }
    if (ammo.data.data.variety === "") updateData["data.variety"] = "heavyPistol";
    if (ammo.data.data.type === "") updateData["data.type"] = "basic";
    await ammo.update(updateData);
  }

  /**
   * Armor changed like so:
   *    Lost quality
   *    Lost amount - create duplicate items in inventory
   *    Gained slots for upgrades
   *    if price is 0 and category is empty, set to 100/premium
   */
  static async updateArmor(armor) {
    LOGGER.trace("updateArmor | 1-activeEffects Migration");
    const { amount } = armor.data.data;
    const updateData = {};
    updateData["data.-=quality"] = null;
    updateData["data.-=amount"] = null;
    // here we assume both values were never touched, and useless defaults still exist
    if (armor.data.data.price.market === 0 && armor.data.data.price.category === "") {
      updateData["data.price.market"] = 100;
      updateData["data.price.category"] = "premium";
    }
    // here we assume the price was updated but not the category, so we update to match
    if (armor.data.data.price.market !== 0 && armor.data.data.price.category === "") {
      updateData["data.price.category"] = armor.getPriceCategory(armor.data.data.price.market);
    }
    updateData["data.slots"] = 3;
    const newItemData = duplicate(await armor.update(updateData));
    newItemData.data.equipped = "carried";
    if (armor.isOwned && amount > 1) {
      const dupeItems = [];
      for (let i = 1; i < amount; i += 1) {
        dupeItems.push(duplicate(newItemData));
      }
      await armor.actor.createEmbeddedDocuments("Item", dupeItems);
    }
  }
}
