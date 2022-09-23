/* global game, CONFIG, ChatMessage, renderTemplate, canvas, $ */
import LOGGER from "../utils/cpr-logger.js";
import { CPRRoll, CPRDamageRoll, CPRInitiative } from "../rolls/cpr-rolls.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import DamageApplicationPrompt from "../dialog/cpr-damage-application-prompt.js";

/**
 * For the sake of aesthetics, we have a class for Chat cards. It wraps around
 * ChatMessage, but note it does not actually extend the Foundry-provided class.
 */
export default class CPRChat {
  /**
   * Set up chat data in a manner similar to Foundry ChatMessages
   *
   * @static
   * @param {*} content - html content of the chat message
   * @param {*} modeOverride - a means to override the "roll mode" (blind, private, etc)
   * @param {*} forceWhisper - a flag forcing the chat message to be a whisper
   * @param {*} isRoll - a flag indicating whether the chat message is from a dice roll
   * @returns {*} - object encapsulating chat message data
   */
  static ChatDataSetup(content, modeOverride, forceWhisper, isRoll = false) {
    LOGGER.trace("ChatDataSetup | CPRChat | Called.");
    const chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content,
    };

    if (isRoll) {
      chatData.sound = CONFIG.sounds.dice;
    }

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
      chatData.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
    }

    if (chatData.rollMode === "blindroll") {
      chatData.blind = true;
    } else if (chatData.rollMode === "selfroll") {
      chatData.whisper = [game.user];
    }

    if (forceWhisper) {
      chatData.speaker = ChatMessage.getSpeaker();
      chatData.whisper = ChatMessage.getWhisperRecipients(forceWhisper);
    }

    return chatData;
  }

  /**
   * Render a chat message meant to show dice results. Often called Roll Cards.
   *
   * @static
   * @param {} cprRoll - from cpr-roll.js, a custom roll object that includes the results
   * @returns - a created chat message
   */
  static RenderRollCard(incomingRoll) {
    LOGGER.trace("RenderRollCard | CPRChat | Called.");

    const cprRoll = incomingRoll;

    cprRoll.criticalCard = cprRoll.wasCritical();
    if (cprRoll instanceof CPRInitiative && !cprRoll.calculateCritical) {
      cprRoll.criticalCard = false;
    }

    return renderTemplate(cprRoll.rollCard, cprRoll).then((html) => {
      const chatOptions = this.ChatDataSetup(html);

      if (cprRoll.entityData !== undefined && cprRoll.entityData !== null) {
        let actor;
        const actorId = cprRoll.entityData.actor;
        const tokenId = cprRoll.entityData.token;
        if (tokenId) {
          actor = (Object.keys(game.actors.tokens).includes(tokenId))
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
        } else {
          [actor] = game.actors.filter((a) => a.id === actorId);
        }
        const alias = actor.name;
        chatOptions.speaker = { actor, alias };
      }
      return ChatMessage.create(chatOptions, false);
    });
  }

  /**
   * Render an "item card" for an item linked to chat.
   *
   * This implementation has an edge-case design flaw. The content of item descriptions can
   * be any length, and this code arbitrarily limits it to 5000 characters to avoid excessively
   * long chat messages. The content of a chat message (and an Item card) is html though, so
   * the 5000 character limit might cut right into an html tag, creating bizarre UI results.
   * This design is not fixable with built-in JavaScript because html is a context-free language.
   * Neither regular expressions nor built-in parsers can reliably parse html.
   *
   * The real fix is to either store non-html versions of the item description on the item, or
   * bring in a more serious parser as a 3rd party module.
   *
   * @static
   * @param {*} item - an Item object representing the item to render details about.
   * @returns - the rendered template that will be displayed
   */
  static RenderItemCard(item) {
    LOGGER.trace("RenderItemCard | CPRChat | Called.");
    const trimmedItem = item;
    const itemTemplate = "systems/cyberpunk-red-core/templates/item/cpr-item-roll-card.hbs";

    // trim strings so layout does not get too goofy
    const maxNameLen = 16;
    trimmedItem.trimName = item.name;
    if (trimmedItem.name === null || trimmedItem.trimName.length > maxNameLen) {
      trimmedItem.trimName = `${trimmedItem.trimName.slice(0, maxNameLen - 1)}…`;
    }
    const maxDescLen = 5000;
    trimmedItem.trimDesc = item.system.description.value;
    if (trimmedItem.trimDesc === null || trimmedItem.trimDesc.length === 0) {
      trimmedItem.trimDesc = "(No description)";
    } else if (trimmedItem.trimDesc.length > maxDescLen) {
      // here is the dangerous code
      trimmedItem.trimDesc = `${trimmedItem.trimDesc.slice(0, maxDescLen - 1)}…`;
    }

    return renderTemplate(itemTemplate, trimmedItem).then((html) => {
      const chatOptions = this.ChatDataSetup(html);
      if (item.entityData !== undefined && item.entityData !== null) {
        const actor = game.actors.filter((a) => a.id === item.entityData.actor)[0];
        let alias = actor.name;
        if (item.entityData.token !== null) {
          const token = game.actors.tokens[item.entityData.token];
          if (token !== undefined) {
            alias = token.name;
          }
        }
        chatOptions.speaker = { actor, alias };
      }
      return ChatMessage.create(chatOptions, false);
    });
  }

  /**
   * When damage is applied to an actor using the glyph on a damage card, we render another
   * chat card indicating the damage dealth and armor ablation.
   *
   * @param {Object} damageData - details about the damage dealt
   * @returns ChatMessage
   */
  static RenderDamageApplicationCard(damageData) {
    LOGGER.trace("RenderDamageApplicationCard | CPRChat | Called.");
    const damageApplicationTemplate = "systems/cyberpunk-red-core/templates/chat/cpr-damage-application-card.hbs";

    return renderTemplate(damageApplicationTemplate, damageData).then((html) => {
      const chatOptions = this.ChatDataSetup(html);

      if (damageData.entityData !== undefined && damageData.entityData !== null) {
        let actor;
        const actorId = damageData.entityData.actor;
        const tokenId = damageData.entityData.token;
        if (tokenId) {
          actor = (Object.keys(game.actors.tokens).includes(tokenId))
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
        } else {
          [actor] = game.actors.filter((a) => a.id === actorId);
        }
        const alias = actor.name;
        chatOptions.speaker = { actor, alias };
      }
      return ChatMessage.create(chatOptions, false);
    });
  }

  /**
   * Process a /red command typed into chat. This rolls dice based on arguments
   * passed in, among other things.
   *
   * @async
   * @static
   * @param {*} data - a string of whatever the user typed in with /red
   */
  static async HandleCPRCommand(data) {
    LOGGER.trace("HandleCPRCommand | CPRChat | Called.");
    // First, let's see if we can figure out what was passed to /red
    // Right now, we will assume it is a roll
    const modifiers = /[+-][0-9][0-9]*/;
    const dice = /[0-9][0-9]*d[0-9][0-9]*/;
    let formula = "1d10";
    let rollDescription = "";
    if (data.includes("#")) {
      rollDescription = data.slice(data.indexOf("#") + 1);
    }
    if (data.match(dice)) {
      [formula] = data.match(dice);
    }
    if (data.match(modifiers)) {
      const formulaModifiers = data.replace(formula, "").replace("#", "").replace(rollDescription, "");
      formula = `${formula}${formulaModifiers}`;
    }
    if (formula) {
      let cprRoll;
      if (formula.includes("d6")) {
        cprRoll = new CPRDamageRoll(SystemUtils.Localize("CPR.rolls.roll"), formula);
      } else {
        cprRoll = new CPRRoll(SystemUtils.Localize("CPR.rolls.roll"), formula);
      }
      if (rollDescription !== "") {
        cprRoll.rollCardExtraArgs.rollDescription = rollDescription;
      }
      if (cprRoll.die !== "d6" && cprRoll.die !== "d10") {
        cprRoll.calculateCritical = false;
        cprRoll.die = "generic";
      }
      await cprRoll.roll();
      this.RenderRollCard(cprRoll);
    }
  }

  /**
   * Provide listeners (just like on actor sheets) that do things when an element is
   * clicked. In particular here, this is for showing/hiding roll details, and rolling
   * damage.
   *
   * @async
   * @static
   * @param {*} html - html DOM
   */
  static async chatListeners(html) {
    LOGGER.trace("chatListeners | CPRChat | Called.");
    html.on("click", ".clickable", async (event) => {
      const clickAction = SystemUtils.GetEventDatum(event, "data-action");

      switch (clickAction) {
        case "toggleVisibility": {
          const elementName = SystemUtils.GetEventDatum(event, "data-visible-element");
          $(html).find(`.${elementName}`).toggleClass("hide");
          break;
        }
        case "rollDamage": {
          // This will let us click a damage link off of the attack card
          const rollType = "damage";
          const actorId = SystemUtils.GetEventDatum(event, "data-actor-id");
          const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
          const tokenId = SystemUtils.GetEventDatum(event, "data-token-id");
          const location = SystemUtils.GetEventDatum(event, "data-damage-location");
          const attackType = SystemUtils.GetEventDatum(event, "data-attack-type");
          const actor = (Object.keys(game.actors.tokens).includes(tokenId))
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
          const item = actor ? actor.items.find((i) => i.id === itemId) : null;
          const displayName = actor === null ? "ERROR" : actor.name;
          if (!item) {
            SystemUtils.DisplayMessage("warn", `[${displayName}] ${SystemUtils.Localize("CPR.actormissingitem")} ${itemId}`);
            return;
          }
          let cprRoll = item.createRoll(rollType, actor, { damageType: attackType });

          if (location) {
            cprRoll.location = location;
          }

          const keepRolling = await cprRoll.handleRollDialog(event);
          if (!keepRolling) {
            return;
          }

          cprRoll = await item.confirmRoll(cprRoll);
          await cprRoll.roll();
          cprRoll.entityData = { actor: actorId, token: tokenId, item: itemId };
          CPRChat.RenderRollCard(cprRoll);
          break;
        }
        case "itemEdit": {
          const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
          const actorId = SystemUtils.GetEventDatum(event, "data-actor-id");
          const tokenId = SystemUtils.GetEventDatum(event, "data-token-id");
          const actor = (Object.keys(game.actors.tokens).includes(tokenId))
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
          const item = actor.items.find((i) => i._id === itemId);
          item.sheet.render(true, { editable: false });
          break;
        }
        case "applyDamage": {
          this.damageApplication(event);
          break;
        }
        default: {
          LOGGER.warn(`No action defined for ${clickAction}`);
        }
      }
    });
  }

  /**
   * This is called from a hook in chat.js. Whenever a chat message is displayed, a few
   * tag elements are injected into the chat message to indicate if it was a whisper, or
   * the type of roll that occurred, such as blind or self.
   *
   * There is a minor design flaw here too. This code cannot tell if the messageData is a roll
   * because CPR never sets roll information to chat messages. This is due to our Dice So Nice integration.
   *
   * @param {*} html - html DOM
   * @param {*} messageData - an object with a bunch of chat message data (see ChatDataSetup above)
   */
  static addMessageTags(html, messageData) {
    LOGGER.trace("addMessageTags | CPRChat | Called.");
    const timestampTag = html.find(".message-timestamp");
    const whisperTargets = messageData.message.whisper;
    const isBlind = messageData.message.blind || false;
    const isWhisper = whisperTargets?.length > 0 || false;
    const isSelf = isWhisper && whisperTargets.length === 1 && whisperTargets[0] === messageData.message.user;
    const indicatorElement = $("<span>");
    indicatorElement.addClass("chat-mode-indicator");

    // Inject tag to the left of the timestamp
    if (isBlind) {
      indicatorElement.text(SystemUtils.Localize("CPR.chat.blind"));
      timestampTag.before(indicatorElement);
    } else if (isSelf) {
      indicatorElement.text(SystemUtils.Localize("CPR.chat.self"));
      timestampTag.before(indicatorElement);
    } else if (isWhisper) {
      indicatorElement.text(SystemUtils.Localize("CPR.chat.whisper"));
      timestampTag.before(indicatorElement);
    }
  }

  /**
   * Handle the damage application from the chat message. It is called from the chatListeners.
   *
   * @param {*} event - event data from the chat message
   */
  static async damageApplication(event) {
    LOGGER.trace("damageApplication | CPRChat | Called.");
    const totalDamage = parseInt(SystemUtils.GetEventDatum(event, "data-total-damage"), 10);
    const bonusDamage = parseInt(SystemUtils.GetEventDatum(event, "data-bonus-damage"), 10);
    const damageLethal = (/true/i).test(SystemUtils.GetEventDatum(event, "data-damage-lethal"));
    let location = SystemUtils.GetEventDatum(event, "data-damage-location");
    if (location !== "head" && location !== "brain") {
      location = "body";
    }
    const ablation = parseInt(SystemUtils.GetEventDatum(event, "data-ablation"), 10);
    const ignoreHalfArmor = (/true/i).test(SystemUtils.GetEventDatum(event, "data-ignore-half-armor"));
    const tokens = canvas.tokens.controlled;
    if (tokens.length === 0) {
      SystemUtils.DisplayMessage("warn", "CPR.chat.damageApplication.noTokenSelected");
      return;
    }
    const allowedTypes = [
      "character",
      "mook",
      "demon",
      "blackIce",
    ];
    const allowedActors = [];
    const forbiddenActors = [];
    tokens.forEach((t) => {
      const { actor } = t;
      if (allowedTypes.includes(actor.type)) {
        allowedActors.push(actor);
      } else {
        forbiddenActors.push(actor);
      }
    });
    if (!event.ctrlKey) {
      const title = SystemUtils.Localize("CPR.chat.damageApplication.prompt.title");
      const allowedTypesMessage = `${SystemUtils.Format("CPR.chat.damageApplication.prompt.allowedTypes", { location })}`;
      const data = { allowedTypesMessage, allowedActors, forbiddenActors };
      const confirmation = await DamageApplicationPrompt.RenderPrompt(title, data);
      if (!confirmation) {
        return;
      }
    }
    allowedActors.forEach((a) => {
      a._applyDamage(totalDamage, bonusDamage, location, ablation, ignoreHalfArmor, damageLethal);
    });
  }
}
