/* eslint-disable consistent-return */
/* global Hooks game Macro */
import LOGGER from "../utils/cpr-logger.js";

/**
 * Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const hotbarHooks = () => {
  /**
   * The hotbarDrop Hook is provided by Foundry and triggered here. When something is dropped on the hotbar, this
   * fires. In our code, we use that translate a dragged thing into a usable macro. Examples:
   *
   * Create a macro when dropping an entity on the hotbar
   * Item      - open roll dialog for item
   * Actor     - open actor sheet
   * Journal   - open journal sheet
   *
   * @public
   * @memberof hookEvents
   * @param {Hotbar} (unused)    - the instance of the Hotbar object provided by Foundry
   * @param {Object} data        - a trimmed object representing what dragged
   * @param {Number} slot        - The slot # that was dragged to
   * @return {Null}
   */
  Hooks.on("hotbarDrop", (_, data, slot) => {
    LOGGER.trace("hotbarDrop | hotbarHooks | Called.");
    const macroObject = {
      name: "",
      type: "script",
      img: "",
      command: "",
    };
    let macro = null;
    let command = "";
    if (data.type === "Item") {
      if (data.system === undefined || data.system === undefined || data.system.data === undefined || data.system.data._id === undefined) {
        return;
      }
      const itemId = data.system.data._id;
      let item = game.items.find((i) => i.id === itemId);

      if (item === null || typeof item === "undefined") {
        // Item not found in the world, check actor for the item
        if (data.system.actorId !== undefined) {
          const actor = game.actors.find((a) => a.id === data.system.actorId);
          if (actor !== null) {
            item = actor.getEmbeddedDocument("Item", itemId);
          }
        }
      }

      if (item === null) {
        return;
      }

      // Create item macro if rollable item - weapon, cyberware weapon or skill
      if (item.type !== "weapon" && !(item.type === "cyberware" && item.system.isWeapon) && item.type !== "skill") {
        return;
      }
      command += "// Set this to true if you want to skip the roll verify prompt.\n";
      command += "// Do not delete the semi-colon at the end of the line!\n";
      command += "const skipPrompt = false;\n";
      command += "\n";
      const itemName = item.name.replace(/\\/g, "\\\\").replace(/\\([\s\S])|(")/g, "\\$1$2");
      if (item.type === "weapon" || (item.type === "cyberware" && item.system.isWeapon)) {
        command += "// The roll type of the weapon for this macro is configurable.\n";
        command += "// By default, we do the standard attack, however the rollType,\n";
        command += "// may be configured by setting it to a different value:\n";
        command += "//\n";
        command += "// damage - Set the rollType to this to roll damage instead of an attack\n";
        command += "//\n";
        if (item.system.isRanged) {
          command += "// For ranged weapons, you can configure a number of alternate fire:\n";
          command += "// attacks:\n";
          command += "//\n";
          command += "// aimed       - Performs an aimed shot\n";
          command += "// autofire    - Performs an autofire attack,\n";
          command += "//               use only for SMG types and Assault Rifles\n";
          command += "// suppressive - Performs a suppressive fire attack,\n";
          command += "//               use only for SMG types and Assault Rifles\n";
          command += "//\n";
        }
        command += "// Simply change the \"attack\" to one of the above to change the function.\n";
        command += "\n";
        command += "const rollType = \"attack\";\n";
        command += "\n";
        command += "// Do not edit anything below this line, please.\n";
        command += "\n";
        command += `game.cpr.macro.rollItemMacro("${itemName}", {skipPrompt, rollType});`;
      } else if (item.type === "skill") {
        command += `game.cpr.macro.rollItemMacro("${itemName}", {skipPrompt});`;
      }
      macro = game.macros.contents.find((m) => (m.name === item.name) && (m.command === command));
      const img = item.type === "skill" ? "systems/cyberpunk-red-core/icons/chip-skill.png" : item.img;
      if (!macro) {
        macroObject.name = item.name;
        macroObject.img = img;
        macroObject.command = command;
      }
    } else if (data.type === "Actor") {
      // Create a macro to open the actor sheet of the actor dropped on the hotbar

      const actor = game.actors.get(data.id);
      command = `game.actors.get("${data.id}").sheet.render(true)`;
      macro = game.macros.contents.find((m) => (m.name === actor.name) && (m.command === command));
      if (!macro) {
        macroObject.name = actor.name;
        macroObject.img = actor.img;
        macroObject.command = command;
      }
    } else if (data.type === "JournalEntry") {
      // Create a macro to open the journal sheet of the journal dropped on the hotbar
      const journal = game.journal.get(data.id);
      command = `game.journal.get("${data.id}").sheet.render(true)`;
      macro = game.macros.contents.find((m) => (m.name === journal.name) && (m.command === command));
      if (!macro) {
        macroObject.name = journal.name;
        macroObject.img = "systems/cyberpunk-red-core/icons/memory-card.svg";
        macroObject.command = command;
      }
    }
    if (macroObject.name !== "") {
      Macro.create(macroObject, { displaySheet: false }).then((newMacro) => {
        game.user.assignHotbarMacro(newMacro, slot);
      });
    } else {
      game.user.assignHotbarMacro(macro, slot);
    }
    return false;
  });
};

export default hotbarHooks;
