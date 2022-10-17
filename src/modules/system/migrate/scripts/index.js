/* eslint-disable import/no-cycle */
// add your migration scripts here
export { default as BaseMigration } from "./000-base.js";
export { default as ActiveEffectsMigration } from "./001-activeEffects.js";
export { default as FoundryV10Migration } from "./002-foundryV10.js";
export { default as UniversalInstallMigration } from "./003-universalInstall.js";
