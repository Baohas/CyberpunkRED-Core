/* global ActiveEffectConfig CONST game mergeObject */
/* eslint-env jquery */
import LOGGER from "./utils/cpr-logger.js";
import SystemUtils from "./utils/cpr-systemUtils.js";

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
      template: `systems/${game.system.id}/templates/effects/cpr-active-effect-sheet.hbs`,
      defaultWidth,
      defaultHeight,
      width: defaultWidth,
      height: defaultHeight,
      // Submit on close to prevent an edge case where a user adds and active effect, but doesn't change anything.
      // If they closed the dialog (without submitting) then there was just a blank AE on their sheet. This setting prevents that.
      submitOnClose: true,
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
    html.find(".effect-change-key").change(() => this._changeModKey());
    html.find(".effect-change-control").click((event) => this._effectChangeControl(event));
    html.find(".toggle-situational").click((event) => this._toggleSituational(event));
  }

  /**
   * Change the key category flag on an active effect.
   * Also submit the form to prevent duplicate change keys on the same AE. (see next function's jsdocs)
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

    this.submit({
      preventClose: true,
    });
    return effect.setModKeyCategory(modnum, keyCategory);
  }

  /**
   * Submit the form when we change the key on an active effect.
   * The goal is to prevent duplicate change keys on the same AE. How?
   * In the handlebars template, change keys that already exist on this AE are disabled.
   * Submitting rerenders the sheet, disabling the correct values in the drop-down so that they cannot be selected.
   *
   * @async
   * @callback
   * @private
   */
  async _changeModKey() {
    LOGGER.trace("_changeModKey | CPRActiveEffectSheet | Called.");
    this.submit({
      preventClose: true,
    });
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

  async _toggleSituational(event) {
    LOGGER.trace("_toggleSituational | CPRActiveEffectSheet | Called.");
    const effect = this.object;
    const modnum = SystemUtils.GetEventDatum(event, "data-index");
    const isSituational = event.target.checked;

    await effect.setFlag(`${game.system.id}`, `changes.situational.${modnum}`, isSituational);

    this.submit({
      preventClose: true,
    });
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
          key: "",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "",
        },
        // we set the default "key category" here
        [`flags.${game.system.id}.changes.cats.${idx}`]: "skill",
        [`flags.${game.system.id}.changes.situational.${idx}`]: false,
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
    await effect.unsetFlag(game.system.id, `changes.cats.${button.dataset.index}`);
    await effect.unsetFlag(game.system.id, `changes.situational.${button.dataset.index}`);
    return this.submit({ preventClose: true }).then(() => this.render());
  }

  getData() {
    LOGGER.trace("getData | CPRActiveEffectSheet | Called.");
    const data = super.getData();
    data.effectParent = this.document.getEffectParent();
    return data;
  }
}
