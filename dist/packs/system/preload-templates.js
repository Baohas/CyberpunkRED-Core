/* global loadTemplates */
import LOGGER from "../utils/cpr-logger.js";

export default function preloadHandlebarsTemplates() {
  LOGGER.log("Calling Preload Handlebars");
  return loadTemplates([
    // Chat Partials
    "systems/cyberpunk-red-core/templates/chat/cpr-base-rollcard.hbs",
    "systems/cyberpunk-red-core/templates/chat/cpr-damage-rollcard.hbs",
    "systems/cyberpunk-red-core/templates/chat/cpr-damage-application-card.hbs",

    // Dialog Partials
    "systems/cyberpunk-red-core/templates/dialog/cpr-confirmation-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-damage-application-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-install-cyberware-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-ledger-deletion-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-ledger-edit-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-ledger-form.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-load-ammo-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-mod-mook-skill-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-mook-name-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-role-ability-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-roll-critical-injury-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-select-compatible-ammo-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-select-role-bonuses-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-split-item-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/cpr-update-announcement.hbs",
    "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-verify-roll-cyberdeck-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-verify-roll-damage-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-verify-roll-deathsave-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-verify-roll-generic-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-verify-roll-roleAbility-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-verify-roll-skill-prompt.hbs",
    "systems/cyberpunk-red-core/templates/dialog/rolls/cpr-verify-roll-stat-prompt.hbs",

    // Left Pane Actor Partials
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-deathsave-block.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-handle-block.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-hitpoint-block.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-humanity-block.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-image-block.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-ip-block.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-role-block.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/left-pane/cpr-stat-block.hbs",

    // Right Pane Actor Partials
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/cpr-cyberware.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/cpr-effects.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/cpr-gear.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/cpr-skills.hbs",

    // Bottom Pane Actor Partials
    "systems/cyberpunk-red-core/templates/actor/parts/bottom-pane/cpr-fight.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/bottom-pane/cpr-lifepath.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/bottom-pane/cpr-role.hbs",

    // Skill Tab Partials
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/skills/cpr-skills-category.hbs",

    // Gear Tab Partials
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-ammo-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-armor-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-clothing-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-cyberdeck-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-cyberware-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-cyberware-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-drug-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-gear-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-itemUpgrade-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-program-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-program-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-vehicle-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/gear/cpr-weapon-content.hbs",

    // Cyberware Tab Partials
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/cyberware/cpr-cyberware-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/right-pane/parts/cyberware/cpr-cyberware-header.hbs",

    // Common Partials - Actions
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-actions.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-dv-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-equip-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-install-cyberware-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-install-programs-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-reload-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-repair-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-snort-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-split-item.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-uninstall-glyph.hbs",
    "systems/cyberpunk-red-core/templates/actor/parts/common/actions/cpr-upgrade-glyph.hbs",

    // Debug
    "systems/cyberpunk-red-core/templates/actor/parts/debug/cpr-item-debug.hbs",
    "systems/cyberpunk-red-core/templates/actor/work-in-progress.hbs",

    // Mook Sheet Partials
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-armor.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-criticalInjury.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-gear.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-image.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-program.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-sheet-limited.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-skills.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-stats.hbs",
    "systems/cyberpunk-red-core/templates/actor/mooks/cpr-mook-weapons.hbs",

    // Container Sheet
    "systems/cyberpunk-red-core/templates/actor/container/cpr-container-actions.hbs",
    "systems/cyberpunk-red-core/templates/actor/container/cpr-item-content.hbs",
    "systems/cyberpunk-red-core/templates/actor/cpr-container-sheet.hbs",

    // Item Sheet
    "systems/cyberpunk-red-core/templates/item/cpr-item-sheet.hbs",
    "systems/cyberpunk-red-core/templates/item/cpr-item-description.hbs",
    "systems/cyberpunk-red-core/templates/item/cpr-item-settings.hbs",
    "systems/cyberpunk-red-core/templates/item/cpr-item-name.hbs",

    // Item Sheet Partials
    // Description Mixins
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-attackable.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-effects.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-equippable.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-loadable.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-installable.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-physical.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-stackable.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-upgradable.hbs",
    "systems/cyberpunk-red-core/templates/item/description/mixin/cpr-valuable.hbs",

    // Description Types
    "systems/cyberpunk-red-core/templates/item/description/cpr-ammo.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-armor.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-clothing.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-criticalInjury.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-cyberdeck.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-cyberware.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-drug.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-gear.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-itemUpgrade.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-netarch.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-program.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-role.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-skill.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-vehicle.hbs",
    "systems/cyberpunk-red-core/templates/item/description/cpr-weapon.hbs",

    // Setting Mixins
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-attackable.hbs",
    "systems/cyberpunk-red-core/templates/item/cpr-item-effects.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-equippable.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-loadable.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-installable.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-physical.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-stackable.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-upgradable.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/mixin/cpr-valuable.hbs",

    // Setting Types
    "systems/cyberpunk-red-core/templates/item/settings/cpr-ammo.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-armor.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-clothing.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-criticalInjury.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-cyberdeck.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-cyberware.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-drug.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-gear.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-itemUpgrade.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-netarch.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-program.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-role.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-skill.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-vehicle.hbs",
    "systems/cyberpunk-red-core/templates/item/settings/cpr-weapon.hbs",

    // Active Effects Sheet
    "systems/cyberpunk-red-core/templates/effects/cpr-active-effect-sheet.hbs",
  ]);
}
