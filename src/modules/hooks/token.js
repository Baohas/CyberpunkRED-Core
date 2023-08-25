/* global Hooks game ui */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const tokenHooks = () => {
  /**
   * The preUpdateToken Hook is provided by Foundry and triggered here. When a token is updated, this hook is called
   * just before. This hook is for container tokens being updated. The GM can set a flag that prevents
   * players from moving the container, and we check that here. If a player tries to move a container they're not
   * allowed to, we emit a warning.
   *
   * @public
   * @memberof hookEvents
   * @param {tokenDocument} tokenDocument           The tokenDocument object being updated
   * @param {object} data           A trimmed object with the data being updated
   * @param {object} (unused)       Additional options which modify the update request
   * @param {string} (unused)       The ID of the requesting user, always game.user.id
   */
  Hooks.on("preUpdateToken", (tokenDocument, data) => {
    LOGGER.trace("preUpdateToken | tokenHooks | Called.");
    if (tokenDocument.actor.type === "container" && !game.user.isGM) {
      // Defined x and/or y properties indicate the token is attempting to move to a new coordinate location.
      // this indicates a moved token, so we check the permissions.
      if (typeof data.x !== "undefined" || typeof data.y !== "undefined") {
        if (
          typeof tokenDocument.actor.getFlag(game.system.id, "players-move") ===
          "undefined"
        ) {
          SystemUtils.DisplayMessage(
            "warn",
            SystemUtils.Localize("CPR.messages.insufficientPermissions")
          );
          return false;
        }
      }
    }
    return true;
  });

  /**
   * The deleteToken Hook is provided by Foundry and triggered here. When a token is deleted, this hook is called
   * just before. This hook is for unlinked  tokens being deleted.  If you have a sheet open for an unlinked token
   * and you delete the token, the data in the sheet is essentially orphaned as it lost the source of the data.
   * This causes foundry to throw an error.
   *
   * @public
   * @memberof hookEvents
   * @param {TokenDocument} tokenDocument  The token object being deleted
   * @param {object} (unused)              Additional options passed by Foundry which modify the delete request
   * @param {string} (unused)              The ID of the requesting user, always game.user.id
   */
  Hooks.on("deleteToken", (tokenDocument) => {
    LOGGER.trace("deleteToken | tokenHooks | Called.");
    if (!tokenDocument.isLinked) {
      const tokenId = tokenDocument.id;
      const actorId = tokenDocument.actor.id;
      const currentWindows = Object.values(ui.windows);
      currentWindows.forEach((window) => {
        if (window.id === `actor-${actorId}-${tokenId}`) {
          window.close();
        }
      });
    }
  });

  /**
   * The createToken Hook is provided by Foundry and triggered here. When a token is created, this hook is called
   * just after. This hook is for unlinked tokens being created.  When an unlinked token is created, the actor data
   * becomes a synthetic actor and only differential data is stored to the token. With the Universal Install system,
   * without this hook, all installed items and items that have installed items would have references back to the
   * original actor that was used to create this token.  This hook updates all owned items which have references to
   * other owned items.
   *
   * Note: When this hook is called, it is called for all users, players included. You can avoid this by checking if
   * tokenDocument.isOwner.
   *
   * @public
   * @memberof hookEvents
   * @param {TokenDocument} tokenDocument  The token object created
   * @param {object} (unused)              Additional options passed by Foundry which modify the create request
   * @param {string} (unused)              The ID of the requesting user, always game.user.id
   */
  Hooks.on("createToken", (tokenDocument, options, user) => {
    LOGGER.trace("createToken | tokenHooks | Called.");
    const installableActors = ["mook", "character"]; // Define actors that can have items 'installed' into them.
    const updateList = [];
    if (
      !tokenDocument.isLinked &&
      tokenDocument.isOwner && // Only fire if the user owns the token being created. preventing permissions errors.
      installableActors.includes(tokenDocument.actor.type) // Only fire for actors that can have installed items.
    ) {
      const loadableTypes = SystemUtils.GetTemplateItemTypes("loadable");
      const loadedItems = tokenDocument.actor.items.filter((i) =>
        loadableTypes.includes(i.type)
      );

      for (const item of loadedItems) {
        const itemUpdates = {
          _id: item._id,
          system: {},
        };

        if (loadableTypes.includes(item.type)) {
          const ammoId = item.system.magazine.ammoData.uuid.split(".").pop();
          const ammoItem = tokenDocument.actor.getOwnedItem(ammoId);
          if (ammoItem) {
            itemUpdates.system.magazine = { ammoData: { name: "", uuid: "" } };
            itemUpdates.system.magazine.ammoData = {
              name: ammoItem.name,
              uuid: ammoItem.uuid,
            };
          }
        }

        if (Object.keys(itemUpdates.system).length > 0) {
          updateList.push(itemUpdates);
        }
      }
    }
    tokenDocument.actor.updateEmbeddedDocuments("Item", updateList, {});
  });
};

export default tokenHooks;
