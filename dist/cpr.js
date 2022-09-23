/* global Actors ActorSheet CONFIG Hooks Items ItemSheet game isNewerVersion DocumentSheetConfig */
// Object imports
import CPRActiveEffect from "./modules/cpr-active-effect.js";
import CPRActiveEffectSheet from "./modules/cpr-active-effect-sheet.js";
import { actorConstructor, itemConstructor } from "./modules/entity-factory.js";
import CPRBlackIceActorSheet from "./modules/actor/sheet/cpr-black-ice-sheet.js";
import CPRCharacterActorSheet from "./modules/actor/sheet/cpr-character-sheet.js";
import CPRContainerActorSheet from "./modules/actor/sheet/cpr-container-sheet.js";
import CPRDemonActorSheet from "./modules/actor/sheet/cpr-demon-sheet.js";
import CPRMookActorSheet from "./modules/actor/sheet/cpr-mook-sheet.js";
import CPRCombat from "./modules/combat/cpr-combat.js";
import CPRCombatant from "./modules/combat/cpr-combatant.js";

import CPRItemSheet from "./modules/item/sheet/cpr-item-sheet.js";
import LOGGER from "./modules/utils/cpr-logger.js";
import CPRMacro from "./modules/utils/cpr-macros.js";
import SystemUtils from "./modules/utils/cpr-systemUtils.js";
import MigrationRunner from "./modules/system/migrate/migration.js";
import UpdateScreen from "./modules/system/update-popup.js";

// Function imports
import registerHooks from "./modules/system/hooks.js";
import preloadHandlebarsTemplates from "./modules/system/preload-templates.js";
import registerHandlebarsHelpers from "./modules/system/register-helpers.js";
import overrideRulerFunctions from "./modules/system/overrides.js";

// System settings
import registerSystemSettings from "./modules/system/settings.js";

// This defines the version of the Data Model for this release.  We should
// only update this when the Data Model Changes.
const DATA_MODEL_VERSION = 2;
export default DATA_MODEL_VERSION;

Hooks.once("init", async () => {
  LOGGER.log("THANK YOU TO EVERYONE WHO HELPED!!!!");
  LOGGER.credits();
  // Register Actor Sheet Application Classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("cyberpunk-red-core", CPRCharacterActorSheet,
    { label: SystemUtils.Localize("CPR.sheets.characterSheet"), types: ["character", "mook"], makeDefault: true });
  Actors.registerSheet("cyberpunk-red-core", CPRBlackIceActorSheet,
    { label: SystemUtils.Localize("CPR.sheets.blackiceSheet"), types: ["blackIce"], makeDefault: true });
  Actors.registerSheet("cyberpunk-red-core", CPRContainerActorSheet,
    { label: SystemUtils.Localize("CPR.sheets.containerSheet"), types: ["container"], makeDefault: true });
  Actors.registerSheet("cyberpunk-red-core", CPRDemonActorSheet,
    { label: SystemUtils.Localize("CPR.sheets.demonSheet"), types: ["demon"], makeDefault: true });
  Actors.registerSheet("cyberpunk-red-core", CPRMookActorSheet,
    { label: SystemUtils.Localize("CPR.sheets.mookSheet"), types: ["character", "mook"] });

  // Register Item Sheet Application Classes
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("cyberpunk-red-core", CPRItemSheet, {
    types: [
      "ammo",
      "armor",
      "clothing",
      "criticalInjury",
      "cyberdeck",
      "cyberware",
      "drug",
      "gear",
      "itemUpgrade",
      "netarch",
      "program",
      "role",
      "skill",
      "vehicle",
      "weapon",
    ],
    makeDefault: true,
  });

  game.cpr = {
    apps: {
      CPRActiveEffectSheet,
      CPRBlackIceActorSheet,
      CPRCharacterActorSheet,
      CPRContainerActorSheet,
      CPRDemonActorSheet,
      CPRMookActorSheet,
      CPRItemSheet,
    },
    macro: CPRMacro,
  };

  // Assign the actor class to the CONFIG
  CONFIG.ActiveEffect.documentClass = CPRActiveEffect;
  DocumentSheetConfig.registerSheet(CPRActiveEffect, "cyberpunk-red-core", CPRActiveEffectSheet, { makeDefault: true });
  CONFIG.Actor.documentClass = actorConstructor;
  CONFIG.Combat.documentClass = CPRCombat;
  CONFIG.Item.documentClass = itemConstructor;
  CONFIG.Combatant.documentClass = CPRCombatant;

  preloadHandlebarsTemplates();
  registerHandlebarsHelpers();
  registerSystemSettings();
  overrideRulerFunctions();
});

/**
 * Perform a system migration if we are using a newer data model.
 * We allow a hidden system setting to be set so that developers can pick any data model
 * version number to migrate from. This is for migration testing purposes.
 *
 * Our data model version scheme used to follow the system module version scheme (x.y.z),
 * but then we moved to integers for maintainability's sake.
 */
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;

  // Retrofit the old version scheme into the new one. The active effects migration assumes
  // the legacy migration scripts have been run before (i.e. they're on 0.80.0). If that is
  // not the case, we force them to migrate to 0.80.0 before moving to "1".
  let dataModelVersion = (game.settings.get("cyberpunk-red-core", "dataModelVersion")) ? game.settings.get("cyberpunk-red-core", "dataModelVersion") : "0.0";

  LOGGER.debug(`Data model before comparison: ${dataModelVersion}`);
  if (dataModelVersion.indexOf(".") > -1) dataModelVersion = isNewerVersion("0.80.0", dataModelVersion) ? -1 : 0;
  LOGGER.debug(`New data model version is: ${dataModelVersion}`);
  const MR = new MigrationRunner();
  if (await MR.migrateWorld(dataModelVersion, DATA_MODEL_VERSION)) {
    UpdateScreen.RenderPopup();
  }
  // Ensure load bar is gone
  SystemUtils.fadeMigrationBar();
});

registerHooks();
