/* eslint-disable import/no-cycle */
// add your migration scripts here
export { default as RoleAbilityNaNMigration } from "./025-roleAbilities.js";
export { default as ItemQualityMigration } from "./026-itemQuality.js";
export { default as SkillTypeQualityMigration } from "./027-skillType.js";
export { default as AttackableIgnoreArmorMigration } from "./028-ignoreArmor.js";
export { default as ArmorPenaltyMigration } from "./029-armor-penalties.js";
export { default as ElectronicMigration } from "./030-isElectronic.js";
export { default as NetarchTilesMigration } from "./031-netarch-tiles.js";
