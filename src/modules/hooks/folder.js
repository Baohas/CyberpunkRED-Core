/* global Hooks */
import LOGGER from "../utils/cpr-logger.js";

/**
 * Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const folderHooks = () => {
  /**
   * For some reason, when item folders are deleted (and thus their inner items),
   * Foundry does not call the relevant item hooks. We remedy that here.
   *
   * It seems like this should be base foundry behavior but i found this thread in the foundry discord
   * from March 2022: https://discord.com/channels/170995199584108546/811676497965613117/954034330810851369.
   * It was opened as a feature request then and hasn't been included since.
   *
   * @public
   * @memberof hookEvents
   * @param {Document} folder - The folder object
   * @param {object} options - Options for deletion
   * @param {string} userId - user who called the hook
   * @returns {Boolean} - if false, don't delete the folder. if true, delete the folder.
   */
  Hooks.on("preDeleteFolder", (folder, options, userId) => {
    LOGGER.trace("preDeleteFolder | folderHooks | Called.");
    let deleteFolder = true;
    if (
      options.deleteContents && // If the folder deletion deletes the items within.
      folder.type === "Item" && // If we are deleting a folder of Items.
      folder.contents.length > 0 // If the folder contains Items.
    ) {
      for (const item of folder.contents) {
        // Call preDeleteItem hook to make sure we aren't deleting installed world items.
        deleteFolder = Hooks.call("preDeleteItem", item);
      }
      return deleteFolder;
    }
    return deleteFolder;
  });
};

export default folderHooks;
