import * as actorHooks from "../hooks/actor.js";
import * as actorSheetHooks from "../hooks/actor-sheet.js";
import * as chatHooks from "../hooks/chat.js";
import * as externalHooks from "../hooks/external-modules.js";
import * as folderHooks from "../hooks/folder.js";
import * as hotbarHooks from "../hooks/hotbar.js";
import * as itemHooks from "../hooks/item.js";
import * as itemSheetHooks from "../hooks/item-sheet.js";
import * as renderItemDirHooks from "../hooks/render-item-directory.js";
import * as tokenHooks from "../hooks/token.js";
import * as tokenHudHooks from "../hooks/tokenhud.js";
import * as uiHooks from "../hooks/ui.js";

export default function registerHooks() {
  actorHooks.default();
  actorSheetHooks.default();
  chatHooks.default();
  externalHooks.default();
  folderHooks.default();
  hotbarHooks.default();
  itemHooks.default();
  itemSheetHooks.default();
  renderItemDirHooks.default();
  tokenHooks.default();
  tokenHudHooks.default();
  uiHooks.default();
}
