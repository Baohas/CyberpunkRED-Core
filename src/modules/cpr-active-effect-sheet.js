/* global ActiveEffectConfig CONST getProperty game mergeObject */
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
    return mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/effects/cpr-active-effect-sheet.hbs`,
      defaultWidth: "auto",
      defaultHeight: "auto",
      resizable: true,
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
   * Dispatcher that does thing to the "changes" array of an Active Effect. That is
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
        return this._deleteEffectChange(event);
      default:
    }
    return null;
  }

  /**
   * Handle adding a new change (read: mod) to the changes array. A new
   * changes is always added to the end of the array, never in the middle.
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
        [`flags.${game.system.id}.changes.${idx}`]: "skill",
      },
    });
  }

  /**
   * Delete a change (read: mod) provided by an active effect. If the deleted change is in the
   * middle of the list, we need to collapse all of the flags beyond it down one "element".
   * (regenerating from scratch is actually hard because you cannot reverse look up what the
   * values should be due to AEs and custom skills)
   *
   * We play a few games with casting between Number and String to avoid writing migration code.
   *
   * @param {*} event - Mouse click event (someone clicked a trashcan)
   * @returns - whether re-rendering the sheet was successful
   */
  async _deleteEffectChange(event) {
    LOGGER.trace("_deleteEffectChange | CPRActiveEffectSheet | Called.");
    const modnum = parseInt(event.currentTarget.dataset.index, 10);
    // First, delete the change itself in the AE
    const { changes } = this.object;
    changes.splice(modnum, 1);
    // Second, remove the corresponding flag for the deleted change
    const changeFlags = getProperty(this.object, `flags.${game.system.id}.changes`);
    const newFlags = {};
    const flagArray = Object.entries(changeFlags);
    flagArray.sort(); // explicitly sort to guarantee we iterate in numerical order
    flagArray.forEach((chg) => {
      const index = Number(chg[0]);
      const skill = chg[1];
      if (index < modnum) {
        newFlags[String(index)] = skill;
      // we deliberately skip idx === modnum, that's the deleted change
      } else if (index > modnum) {
        newFlags[String(index - 1)] = skill;
      }
    });
    // Finally, update the underlying AE
    const prop = `flags.${game.system.id}.changes`;
    await this.object.update({
      changes,
      [prop]: newFlags,
    });
    return this.submit({ preventClose: true }).then(() => this.render());
  }

  getData() {
    LOGGER.trace("getData | CPRActiveEffectSheet | Called.");
    const data = super.getData();
    data.effectParent = this.document.getEffectParent();
    return data;
  }
}
