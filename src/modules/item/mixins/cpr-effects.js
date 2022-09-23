import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * The Effects mixin in where the logic lives for managing active effects associated with Items.
 * Valid mods are objects shown below. They are in the "changes" property of the active effect.
 * {
 *    key: "system.stats.dex.value"
 *    mode: 2
 *    priority: 10   <-- implies an order to applying effects; not used in this system
 *    value: "20"
 * }
 *
 * mode is an enum with the following behaviors:
 *    0 (CUSTOM) - calls the "applyActiveEffect" hook with the value to figure out what to do with it
 *    1 (MULTIPLY) - multiply this value with the current one
 *    2 (ADD) - add this value to the current value (as an Integer) or set it if currently null
 *    3 (DOWNGRADE) - like OVERRIDE but only replace if the value is lower (worse)
 *    4 (UPGRADE) - like OVERRIDE but only replace if the value is higher (better)
 *    5 (OVERRIDE) - replace the current value with this one
 */
const Effects = function Effects() {
  /**
   * A dispatcher for calling methods that affect active effects.
   *
   * @param {Object} event - object representing what was clicked, dragged, etc
   * @returns - usually the impacted active effect, or null if something was invalid in the event
   */
  this.manageEffects = function manageEffects(event) {
    LOGGER.trace("manageEffects | Effects | Called.");
    event.preventDefault();
    LOGGER.debug("effect listener fired");
    const action = SystemUtils.GetEventDatum(event, "data-action");
    switch (action) {
      case "create":
        return this.createEffect();
      case "edit": {
        const effectId = SystemUtils.GetEventDatum(event, "data-effect-id");
        return this.editEffect(effectId);
      }
      case "delete": {
        const effectId = SystemUtils.GetEventDatum(event, "data-effect-id");
        return this.deleteEffect(effectId);
      }
      case "toggle": {
        const effectId = SystemUtils.GetEventDatum(event, "data-effect-id");
        return this.toggleEffect(effectId);
      }
      default:
        LOGGER.error(`Unknown effects action: ${action}`);
    }
    return null;
  };

  /**
   * Create a new active effect for this item. This sets up all the defaults.
   * Note: It would be nice to add custom properties, but they seem to be ignored by Foundry.
   * This is why we provide a custom CPRActiveEffect object elsewhere in the code base.
   *
   * @returns {ActiveEffect} - the newly created document
   */
  this.createEffect = function createEffect() {
    LOGGER.trace("createEffect | Effects | Called.");
    if (this.isOwned) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.itemSheet.effects.editOwnedWarning"));
      return null;
    }
    return this.createEmbeddedDocuments("ActiveEffect", [{
      label: SystemUtils.Localize("CPR.itemSheet.effects.newEffect"),
      icon: "icons/svg/aura.svg",
      origin: this.uuid,
      disabled: false,
    }]);
  };

  /**
   * Delete the active effect on this item with an ID of "eid"
   *
   * @param {String} eid - active effect ID
   * @returns - the deleted document
   */
  this.deleteEffect = function deleteEffect(eid) {
    LOGGER.trace("deleteEffect | Effects | Called.");
    const effect = this.getEffect(eid);
    if (this.isOwned) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.itemSheet.effects.editOwnedWarning"));
      return null;
    }
    return effect.delete();
  };

  /**
   * Open up the dialog/sheet for editing an active effect with the given ID
   *
   * @param {String} eid - active effect ID
   * @returns
   */
  this.editEffect = function editEffect(eid) {
    LOGGER.trace("editEffect | Effects | Called.");
    if (this.isOwned) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.itemSheet.effects.editOwnedWarning"));
      return null;
    }
    const effect = this.getEffect(eid);
    return effect.sheet.render(true);
  };

  /**
   * Return the active effect object on this item with the given ID. Should be used everywhere to
   * ensure proper error checking.
   *
   * @param {String} eid - active effect ID
   * @returns {ActiveEffect}
   */
  this.getEffect = function getEffect(eid) {
    LOGGER.trace("getEffect | Effects | Called.");
    const effect = this.effects.get(eid);
    if (!effect) {
      LOGGER.error(`Active effect ${eid} does not exist!`);
      return null;
    }
    return effect;
  };

  /**
   * Enable or disable the mods on an active effect on this item.
   *
   * @param {String} eid - active effect ID
   * @returns {ActiveEffect}
   */
  this.toggleEffect = function toggleEffect(eid) {
    LOGGER.trace("toggleEffect | Effects | Called.");
    const effect = this.getEffect(eid);
    const value = !effect.disabled;
    LOGGER.debug(`Setting disabled on ${eid} to ${value}`);
    if (this.isOwned) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.itemSheet.effects.editOwnedWarning"));
      return null;
    }
    return effect.update({ disabled: value });
  };

  /**
   * Based on the data model, determine how an item can be "used" to enable or disable
   * an active effect. This can only be used in the UIs, it is not saved as a property.
   *
   * @return {Array}
   */
  this.getAllowedUsage = function getAllowedUsage() {
    LOGGER.trace("getAllowedUsage | Effects | Called.");
    const usageAllowed = ["always", "toggled"];
    if (this.type === "drug") {
      usageAllowed.push("snorted");
    }
    if (SystemUtils.hasDataModelTemplate(this.type, "physical")) {
      if (this.type !== "cyberware") {
        usageAllowed.push("carried");
        usageAllowed.push("equipped");
      }
    }
    if (this.type === "cyberware") {
      usageAllowed.push("installed");
    }
    if (this.type === "program") {
      usageAllowed.push("rezzed");
    }
    return usageAllowed;
  };

  /**
   * This is where the logic to determine if the effects provided by an item are suppressed or not.
   * For example, an unequipped physical item would have its effects suppressed.
   *
   * This function assumes the item was never given an invalid usage in the first place. It trusts
   * that the UI called getAllowedUsage (above) so that only valid ones are available.
   *
   * @returns {Bool}
   */
  this.areEffectsSuppressed = function areEffectsSuppressed() {
    LOGGER.trace("areEffectsSuppressed | Effects | Called.");
    switch (this.system.usage) {
      case "carried":
        return this.system.equipped === "owned";
      case "equipped":
        return this.system.equipped !== "equipped";
      case "installed":
        return !this.system.isInstalled;
      case "rezzed":
        return !this.system.isRezzed;
      default:
        return false;
    }
  };
};

export default Effects;
