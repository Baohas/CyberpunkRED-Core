import LOGGER from "../utils/cpr-logger.js";

/**
 * Writing imports then exports is tedious, just add them to an array and loop
 * over them.
 *
 * NOTE: This does limit us to using default exports but that was the pattern
 * before this change anyway
 */
const hooksImports = [
  "folder.js",
  "hotbar.js",
  "item.js",
  "item-sheet.js",
  "render-item-directory.js",
  "token.js",
  "tokenhud.js",
  "ui.js",
  "actor/check-emp-and-luck.js",
  "actor/set-default-image.js",
  "actor/sync-black-ice-with-program.js",
  "actor/sync-tracked-armor.js",
  "actor/update-role-from-item.js",
  "actor/update-role-on-item-delete.js",
  "actor/sheet/persist-section-views.js",
  "actor/sheet/resize-name.js",
  "actor/sheet/resize-type-tag.js",
  "chat/add-glyphs.js",
  "chat/hide-blind-rolls.js",
  "chat/parse-red-command.js",
  "external/babele.js",
  "external/drag-ruler.js",
];

export default async function registerHooks() {
  const basePath = "../hooks/";
  const importPromises = hooksImports.map(async (relativePath) => {
    const fullPath = basePath + relativePath;
    try {
      const module = await import(fullPath);
      return module;
    } catch (error) {
      LOGGER.error(`Error importing module from ${fullPath}:`, error);
      return null;
    }
  });

  const importedModules = await Promise.all(importPromises);

  importedModules.forEach((module) => {
    if (module && module.default) {
      module.default(); // Execute the default export function
    }
  });
}
