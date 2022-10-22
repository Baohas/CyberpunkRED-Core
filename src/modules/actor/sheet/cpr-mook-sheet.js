/* global game mergeObject, $, duplicate */
import ConfirmPrompt from "../../dialog/cpr-confirmation-prompt.js";
import CPRActorSheet from "./cpr-actor-sheet.js";
import ModMookSkillPrompt from "../../dialog/cpr-mod-mook-skill-prompt.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import MookNamePrompt from "../../dialog/cpr-mook-name-prompt.js";

/**
 * Extend the basic CPRActorSheet. A lot of code is common between mooks and characters.
 *
 * The point of a mook sheet is to provide a more "at-a-glance" view of a disposable NPC.
 * If the GM or players need a more indepth view of an actor's skills, inventories, and
 * cyberware, they should use the character sheet instead.
 *
 * @extends {CPRActorSheet}
 */
export default class CPRMookActorSheet extends CPRActorSheet {
  /**
   * getter that controls the sheet sizing
   *
   * @override
   */
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | CPRMookActorSheet | Called.");
    const defaultWidth = 750;
    const defaultHeight = 500;
    return mergeObject(super.defaultOptions, {
      defaultWidth,
      defaultHeight,
      width: defaultWidth,
      height: defaultHeight,
    });
  }

  /**
   * Mooks have a separate template when a user only has a "limited" permission level for it.
   * This is how details are obscured from those players, we simply do not render them.
   * Yes, they can still find this information in game.actors and the Foundry development
   * community does not really view this as a problem.
   *
   * https://discord.com/channels/170995199584108546/596076404618166434/864673619098730506
   *
   * @override
   * @property
   * @returns {String} - path to a handlebars template
   */
  get template() {
    LOGGER.trace("get template | CPRMookActorSheet | Called.");
    if (!game.user.isGM && this.actor.limited) {
      return "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-sheet-limited.hbs";
    }
    return "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-sheet.hbs";
  }

  /**
   * We extend CPRActorSheet._render to handle the different height/width of the limited vs. full template.
   * Automatic resizing is not called here, since the parent does that already.
   *
   * @override
   * @private
   * @param {Boolean} force - for this to be rendered. We don't use this, but the parent class does.
   * @param {Object} options - rendering options that are passed up the chain to the parent
   */
  async _render(force = false, options = {}) {
    LOGGER.trace("_render | CPRMookActorSheet | Called.");
    if (!game.user.isGM && this.actor.limited) {
      await super._render(force, mergeObject(options, { width: 670, height: 210 }));
    } else {
      await super._render(force, options);
    }
  }

  /**
   * The Mook sheet goes a little further than actor.getData by tracking whether any armor
   * or weapons (including cyberware weapons) are equipped on the mook.
   *
   * @override
   * @returns {Object} data - a curated structure of actorSheet data
   */
  getData() {
    LOGGER.trace("getData | CPRMookActorSheet | Called.");
    const foundryData = super.getData();
    const cprActorData = foundryData.actor.system;
    cprActorData.equippedArmor = this.actor.itemTypes.armor.filter((item) => item.system.equipped === "equipped");
    cprActorData.equippedWeapons = this.actor.itemTypes.weapon.filter((item) => item.system.equipped === "equipped");
    const installedCyberware = this.actor.getInstalledCyberware();
    const installedWeapons = installedCyberware.filter((c) => c.system.isWeapon === true);
    cprActorData.equippedWeapons = cprActorData.equippedWeapons.concat(installedWeapons);
    foundryData.data.system = cprActorData;
    return foundryData;
  }

  /**
   * Activate listeners for the sheet. This has to call super at the end to get additional
   * listners that are common between mooks and characters.
   *
   * @override
   * @param {Object} html - the DOM object
   */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRMookActorSheet | Called.");
    super.activateListeners(html);
    html.find(".mod-mook-skill").click(() => this._modMookSkills());
    html.find(".change-mook-name").click(() => this._changeMookName());
    html.find(".mook-image-toggle").click((event) => this._expandMookImage(event));

    // If the element is "changeable", check for a keydown action and handle the key press.
    html.find(".changeable").hover((event) => $(event.currentTarget).focus());
    html.find(".changeable").keydown((event) => this._handleKeyPress(event));

    // If the element is "installable", await mouse click and process the event
    html.find(".installable").click((event) => this._handleInstallAction(event));
  }

  /**
   * Called when the edit-skills glyph (top right of the skills section on the sheet) is clicked. This
   * pops up the wizard for modifying mook skills quickly. The form data is then parsed for values that
   * are different from what is current on the mook's skill objects. Those are the updates we send
   * along.
   *
   * @async
   * @callback
   * @private
   * @returns null
   */
  async _modMookSkills() {
    LOGGER.trace("_modMookSkills | CPRMookActorSheet | Called.");
    const skillList = [];
    this.actor.itemTypes.skill.map((s) => {
      const skillRef = {
        name: s.name,
        level: s.system.level,
        stat: this.actor.system.stats[s.system.stat].value,
        mod: this.actor.bonuses[SystemUtils.slugify(s.name)],
      };
      skillList.push(skillRef);
      return skillList.sort((a, b) => ((a.name > b.name) ? 1 : -1));
    });

    // pop up the form with embedded skill details
    const formData = await ModMookSkillPrompt.RenderPrompt({ skillList }).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }

    // go over each skill and see if the value differs from the skill objects on the mook (actor)
    const updatedSkills = [];
    for (const skill of skillList) {
      if (formData[skill.name] !== skill.level) {
        LOGGER.debug(`you changed ${skill.name} from ${skill.level} to ${formData[skill.name]}`);
        const [updatedSkill] = this.actor.itemTypes.skill.filter((s) => skill.name === s.name);
        updatedSkill.setSkillLevel(formData[skill.name]);
        updatedSkills.push({
          _id: updatedSkill._id,
          system: {
            level: updatedSkill.system.level,
          },
        });
      }
    }
    if (!updatedSkills.length) return;

    // finally, update the skill objects
    this.actor.updateEmbeddedDocuments("Item", updatedSkills);
    SystemUtils.DisplayMessage("notify", `${updatedSkills.length} ${SystemUtils.Localize("CPR.mookSheet.skills.updated")}`);
  }

  /**
   * Called when a user clicks on the mook name in the sheet. Pops up a dialog to edit the name.
   *
   * @async
   * @callback
   * @private
   * @returns null
   */
  async _changeMookName() {
    LOGGER.trace("_changeMookName | CPRMookActorSheet | Called.");
    const formData = await MookNamePrompt.RenderPrompt(this.actor.name).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    if (!this.isToken) {
      await this.actor.update(formData);
    } else {
      await this.token.update(formData);
    }
  }

  /**
   * Show or hide the profile icon on the mook sheet when clicked.
   *
   * @callback
   * @private
   * @param {Object} event - event data such as a mouse click or key press
   */
  _expandMookImage(event) {
    LOGGER.trace("_expandMookImage | CPRMookActorSheet | Called.");
    const mookImageArea = $(event.currentTarget).parents(".mook-image");
    const mookImageImg = $(event.currentTarget).parents(".mook-image").children(".mook-image-block");
    const mookImageToggle = $(event.currentTarget);
    let collapsedImage = null;
    if (mookImageToggle.attr("data-text") === SystemUtils.Localize("CPR.mookSheet.image.collapse")) {
      mookImageToggle.attr("data-text", SystemUtils.Localize("CPR.mookSheet.image.expand"));
      collapsedImage = true;
    } else {
      mookImageToggle.attr("data-text", SystemUtils.Localize("CPR.mookSheet.image.collapse"));
      collapsedImage = false;
    }
    mookImageArea.toggleClass("mook-image-small-toggle");
    mookImageImg.toggleClass("hide");
    const cprActorData = duplicate(this.actor.system);
    cprActorData.flags.collapsedImage = collapsedImage;
    this.actor.update(cprActorData);
  }

  /**
   * Called when a user presses a key, but only does things if it was DEL. This is used in conjunction
   * with jQuery's focus() call, which is called on hover. That way, an html element is "selected" just
   * by hovering the mouse over. Then when DEL is pressed, we have a thing that can be deleted from the sheet
   * and the actor object underneath.
   *
   * @async
   * @callback
   * @private
   * @param {Object} event - event data such as a mouse click or key press
   */
  async _handleKeyPress(event) {
    LOGGER.trace("_handleKeyPress | CPRMookActorSheet | Called.");
    LOGGER.debug(event.keyCode);
    if (event.keyCode === 46) {
      LOGGER.debug("DEL key was pressed");
      const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
      const item = this._getOwnedItem(itemId);
      switch (item.type) {
        case "skill": {
          item.setSkillLevel(0);
          this._updateOwnedItem(item);
          break;
        }
        case "cyberware": {
          if (item.system.core === true) {
            SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.messages.cannotDeleteCoreCyberware"));
          } else {
            const foundationalId = SystemUtils.GetEventDatum(event, "data-foundational-id");
            const dialogTitle = SystemUtils.Localize("CPR.dialog.removeCyberware.title");
            const dialogMessage = `${SystemUtils.Localize("CPR.dialog.removeCyberware.text")} ${item.name}?`;
            const confirmRemove = await ConfirmPrompt.RenderPrompt(dialogTitle, dialogMessage);
            if (confirmRemove) {
              await this.actor.removeCyberware(itemId, foundationalId, true);
              this._deleteOwnedItem(item, true);
            }
          }
          break;
        }
        default: {
          this._deleteOwnedItem(item);
          break;
        }
      }
    } else if (event.keyCode === 18) {
      LOGGER.debug("ALT key was pressed");
      $(".skill-name").hide();
    }
  }

  /**
   * Called when a user clicks their mouse on an element with "installable" class.
   *
   * @async
   * @callback
   * @private
   * @param {Object} event - event data such as a mouse click or key press
   */
  async _handleInstallAction(event) {
    LOGGER.trace("_handleInstallAction | CPRMookActorSheet | Called.");
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const item = this._getOwnedItem(itemId);
    if (event.shiftKey) {
      if (item.type === "cyberware") {
        if (item.system.core === true) {
          SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.messages.cannotDeleteCoreCyberware"));
        } else if (item.system.isInstalled === false) {
          this.actor.addCyberware(itemId);
        } else {
          const foundationalId = SystemUtils.GetEventDatum(event, "data-foundational-id");
          const dialogTitle = SystemUtils.Localize("CPR.dialog.removeCyberware.title");
          const dialogMessage = `${SystemUtils.Localize("CPR.dialog.removeCyberware.text")} ${item.name}?`;
          const confirmRemove = await ConfirmPrompt.RenderPrompt(dialogTitle, dialogMessage);
          if (confirmRemove) {
            await this.actor.removeCyberware(itemId, foundationalId, true);
          }
        }
      }
    }
  }
}
