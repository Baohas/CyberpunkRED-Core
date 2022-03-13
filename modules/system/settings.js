/* global game */
import LOGGER from "../utils/cpr-logger.js";

/**
 * This file defines user settings for the system module.
 */
const registerSystemSettings = () => {
  game.settings.register("cyberpunk-red-core", "playersCreateInventory", {
    name: "CPR.settings.playersCreateInventory.name",
    hint: "CPR.settings.playersCreateInventory.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      LOGGER.log(`Changed playersCreateInventory to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "deleteItemConfirmation", {
    name: "CPR.settings.deleteConfirmation.name",
    hint: "CPR.settings.deleteConfirmation.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      LOGGER.log(`Changed deleteItemConfirmation to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "enableSheetContentFilter", {
    name: "CPR.settings.enableSheetContentFilter.name",
    hint: "CPR.settings.enableSheetContentFilter.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      LOGGER.log(`Changed enableSheetContentFilter to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "enablePauseAnimation", {
    name: "CPR.settings.enablePauseAnimation.name",
    hint: "CPR.settings.enablePauseAnimation.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      LOGGER.log(`Changed enablePauseAnimation to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "invertRollCtrlFunction", {
    name: "CPR.settings.invertRollCtrlFunction.name",
    hint: "CPR.settings.invertRollCtrlFunction.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      LOGGER.log(`Changed invertRollCtrlFunction to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "mookSheetSkillDisplay", {
    name: "CPR.settings.mookSheetSkillDisplay.name",
    hint: "CPR.settings.mookSheetSkillDisplay.hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      level: "CPR.settings.mookSheetSkillDisplay.level",
      base: "CPR.settings.mookSheetSkillDisplay.base",
      total: "CPR.settings.mookSheetSkillDisplay.total",
    },
    default: "base",
    onChange: (value) => {
      LOGGER.log(`Changed mookSheetSkillDisplay to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "preventDuplicateCriticalInjuries", {
    name: "CPR.settings.preventDuplicateCriticalInjuries.name",
    hint: "CPR.settings.preventDuplicateCriticalInjuries.hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      off: "CPR.settings.preventDuplicateCriticalInjuries.off",
      warn: "CPR.settings.preventDuplicateCriticalInjuries.warn",
      reroll: "CPR.settings.preventDuplicateCriticalInjuries.reroll",
    },
    default: "off",
    onChange: (value) => {
      LOGGER.log(`Changed preventDuplicateCriticalInjuries to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "automaticallyResizeSheets", {
    name: "CPR.settings.automaticallyResizeSheets.name",
    hint: "CPR.settings.automaticallyResizeSheets.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      LOGGER.log(`Changed automaticallyResizeSheets to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "criticalInitiative", {
    name: "CPR.settings.criticalInitiative.name",
    hint: "CPR.settings.criticalInitiative.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      LOGGER.log(`Changed criticalInitiative to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "userSettings", {
    name: "User Settings",
    scope: "client",
    config: false,
    type: Object,
    default: {},
  });

  // Saves the last time a migration to a data model took place
  game.settings.register("cyberpunk-red-core", "dataModelVersion", {
    name: "CPR.settings.systemDataModelVersion.name",
    hint: "CPR.settings.systemDataModelVersion.hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: (value) => {
      LOGGER.log(`Changed dataModelVersion to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "debugLogs", {
    name: "CPR.settings.debugLogs.name",
    hint: "CPR.settings.debugLogs.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      LOGGER.log(`Changed debugLogs to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "debugElements", {
    name: "CPR.settings.debugElements.name",
    hint: "CPR.settings.debugElements.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      LOGGER.log(`Changed debugElements to ${value}`);
    },
  });

  game.settings.register("cyberpunk-red-core", "traceLogs", {
    name: "CPR.settings.traceLogs.name",
    hint: "CPR.settings.traceLogs.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      LOGGER.log(`Changed traceLogs to ${value}`);
    },
  });
};

export default registerSystemSettings;
