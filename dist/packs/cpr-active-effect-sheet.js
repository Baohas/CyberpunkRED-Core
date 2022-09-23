/* global ActiveEffectConfig CONST mergeObject */
/* eslint-env jquery */
import LOGGER from "./utils/cpr-logger.js";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 * @extends {ActiveEffect}
 */
export default class CPRActiveEffectSheet extends ActiveEffectConfig {
  /**
   * We provide our own ActiveEffects sheet to improve the UX a bit. Specifically this
   * allows us to implement user-readable keys for the mods, and different "usage" types.
   * Most of that logic lives in cpr-active-effect.js.
   */
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | CPRActiveEffectSheet | Called.");
    const defaultWidth = 700;
    const defaultHeight = 280;
    return mergeObject(super.defaultOptions, {
      template: "systems/cyberpunk-red-core/templates/effects/cpr-active-effect-sheet.hbs",
      defaultWidth,
      defaultHeight,
      width: defaultWidth,
      height: defaultHeight,
    });
  }

  /**
   * Some elements of the active effects sheet need special handling when they are changed
   * because of the flag limitation imposed by Foundry.
   *
   * @param {Object} html - the DOM object
   */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRActiveEffectSheet | Called.");
    super.activateListeners(html);
    if (!this.options.editable) return;

    // QoL - Select all text when grabbing text input.
    $("input[type=text]").focusin(() => $(this).select());
    html.find(".effect-key-category").change((event) => this._changeModKeyCategory(event));
    html.find(".effect-change-control").click((event) => this._effectChangeControl(event));
  }

  /**
   * Change the key category flag on an active effect.
   *
   * @async
   * @callback
   * @private
   */
  async _changeModKeyCategory(event) {
    LOGGER.trace("_changeModKeyCategory | CPRActiveEffectSheet | Called.");
    const effect = this.object;
    const modnum = event.currentTarget.dataset.index;
    const keyCategory = event.target.value;
    return effect.setModKeyCategory(modnum, keyCategory);
  }

  /**
   * Dispatcher that does thing to the "changes" array of an Active Effect. There is
   * where the mods are managed.
   *
   * @callback
   * @private
   * @param {Object} event - mouse click event
   * @returns (varies by action)
   */
  _effectChangeControl(event) {
    LOGGER.trace("_effectChangeControl | CPRActiveEffectSheet | Called.");
    event.preventDefault();
    switch (event.currentTarget.dataset.action) {
      case "add":
        return this._addEffectChange();
      case "delete":
        // XXX: this is never actually called because deleting a mod means we need to
        // reorder the flags that come after the deleted mod. The "changes" flag should
        // really be an array.
        return this._deleteEffectChange(event);
      default:
    }
    return null;
  }

  /**
   * Handle adding a new change (read: mod) to the changes array.
   *
   * @async
   * @private
   */
  async _addEffectChange() {
    LOGGER.trace("_addEffectChange | CPRActiveEffectSheet | Called.");
    const idx = this.document.changes.length;
    LOGGER.debug(`adding change defaults for changes.${idx}`);
    return this.submit({
      preventClose: true,
      updateData: {
        [`changes.${idx}`]: {
          key: "bonuses.perception",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "",
        },
        // we set the default "key category" here
        [`flags.cyberpunk-red-core.changes.${idx}`]: "skill",
      },
    });
  }

  /**
   * Delete a change (read: mod) provided by an active effect.
   *
   * @param {*} event - Mouse click event (someone clicked a trashcan)
   * @returns - whether re-rendering the sheet was successful
   */
  async _deleteEffectChange(event) {
    LOGGER.trace("_deleteEffectChange | CPRActiveEffectSheet | Called.");
    const button = event.currentTarget;
    const effect = this.object;
    button.closest(".effect-change").remove();
    // remove the Flag tracking the key category
    // XXX: this doesn't work well if a mod in the middle of the list is deleted
    effect.unsetFlag("cyberpunk-red-core", `changes.${button.dataset.index}`);
    return this.submit({ preventClose: true }).then(() => this.render());
  }

  getData() {
    LOGGER.trace("getData | CPRActiveEffectSheet | Called.");
    const data = super.getData();
    data.effectParent = this.document.getEffectParent();
    return data;
  }
}
