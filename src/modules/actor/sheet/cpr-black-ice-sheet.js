/* global ActorSheet mergeObject game duplicate */
import CPRChat from "../../chat/cpr-chat.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import createImageContextMenu from "../../utils/cpr-imageContextMenu.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

/**
 * Implement the Black-ICE sheet, which extends ActorSheet directly from Foundry. This does
 * not extend CPRActor, as there is very little overlap between Black-ICE and mooks/characters.
 *
 * @extends {ActorSheet}
 */
export default class CPRBlackIceActorSheet extends ActorSheet {
  /**
   * Set up the default options for this Foundry "app".
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @override
   * @static
   */
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | CPRBlackIceActorSheet | Called.");
    return mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/actor/cpr-black-ice-sheet.hbs`,
      width: "auto",
      height: "auto",
    });
  }

  /**
   * Activate listeners for the sheet. This has to call super at the end for Foundry to process
   * events properly.
   *
   * @override
   * @param {Object} html - the DOM object
   */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRBlackIceActorSheet | Called.");
    html.find(".rollable").click((event) => this._onRoll(event));
    html
      .find(".configure-from-program")
      .click((event) => this._configureFromProgram(event));
    this._createBlackIceImageContextMenu(html);
    super.activateListeners(html);
  }

  /**
   * Dispatcher that executes a roll based on the "type" passed in the event. While very similar
   * to _onRoll in CPRActor, Black-ICE has far fewer cases to consider, and copying some of the code
   * here seemed better than making Black-ICE extend a 1000-line class where most of it didn't apply.
   *
   * @private
   * @callback
   * @param {Object} event - object with details of the event
   */
  async _onRoll(event) {
    LOGGER.trace("_onRoll | CPRBlackIceActorSheet | Called.");
    const rollType = SystemUtils.GetEventDatum(event, "data-roll-type");
    const rollName = SystemUtils.GetEventDatum(event, "data-roll-title");
    let cprRoll;
    switch (rollType) {
      case "stat": {
        cprRoll = this.actor.createStatRoll(rollName);
        break;
      }
      case "damage": {
        const programUUID = SystemUtils.GetEventDatum(
          event,
          "data-program-uuid"
        );
        const netrunnerTokenId = SystemUtils.GetEventDatum(
          event,
          "data-netrunner-id"
        );
        const sceneId = SystemUtils.GetEventDatum(event, "data-scene-id");
        cprRoll = this.actor.createDamageRoll(
          programUUID,
          netrunnerTokenId,
          sceneId
        );
        break;
      }
      default:
    }
    cprRoll.setNetCombat(this.actor.name);

    const keepRolling = await cprRoll.handleRollDialog(event, this.actor);
    if (!keepRolling) {
      return;
    }
    await cprRoll.roll();

    // output to chat
    const token = this.token === null ? null : this.token._id;
    cprRoll.entityData = { actor: this.actor.id, token };
    CPRChat.RenderRollCard(cprRoll);
  }

  /**
   * Create a Black-ICE actor from a program Item. This code is called when a user
   * rezzes Black-ICE they have in their Cyberdeck.
   *
   * @async
   * @private
   * @returns {null}
   */
  async _configureFromProgram() {
    LOGGER.trace("_configureFromProgram | CPRBlackIceActorSheet | Called.");
    const biPrograms = game.items.filter(
      (i) => i.type === "program" && i.system.class === "blackice"
    );
    const linkedProgramUUID = this.actor.isToken
      ? this.actor.token.getFlag(game.system.id, "programUUID")
      : null;
    if (linkedProgramUUID === null) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.messages.linkBlackIceWithoutToken")
      );
      return;
    }
    let dialogData = { biProgramList: biPrograms, linkedProgramUUID };
    dialogData = await CPRDialog.showDialog(dialogData, {
      // Set the options for the dialog.
      title: SystemUtils.Localize(
        "CPR.dialog.configureBlackIceActorFromProgram.title"
      ),
      template: `systems/${game.system.id}/templates/dialog/cpr-configure-bi-actor-from-program-prompt.hbs`,
    }).catch((err) => LOGGER.debug(err));
    if (dialogData === undefined) {
      return;
    }
    const { programUUID } = dialogData;
    if (programUUID === "unlink") {
      await this.actor.token.unsetFlag(game.system.id, "programUUID");
    } else {
      const program = biPrograms.filter(
        (p) => p.uuid === dialogData.programUUID
      )[0];
      const cprProgramData = duplicate(program.system);
      this.actor.programmaticallyUpdate(
        cprProgramData.blackIceType,
        cprProgramData.per,
        cprProgramData.spd,
        cprProgramData.atk,
        cprProgramData.def,
        cprProgramData.rez,
        cprProgramData.description.value,
        cprProgramData.rez
      );
      if (this.actor.isToken) {
        this.actor.token.name = program.name;
        this.actor.name = program.name;
        await this.actor.token.setFlag(
          game.system.id,
          "programUUID",
          program.uuid
        );
      }
    }
    this.render(true, { renderData: this.actor.system });
  }

  /**
   * Sets up a ContextMenu that appears when the Actor's image is right clicked.
   * Enables the user to share the image with other players.
   *
   * @param {Object} html - The DOM object
   * @returns {ContextMenu} The created ContextMenu
   */
  _createBlackIceImageContextMenu(html) {
    LOGGER.trace(
      "_createBlackIceImageContextMenu | CPRBlackIceActorSheet | Called."
    );
    return createImageContextMenu(html, ".bice-icon", this.actor);
  }
}
