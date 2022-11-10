/* global game loadTemplates */
import LOGGER from "../utils/cpr-logger.js";

export default function preloadHandlebarsTemplates() {
  LOGGER.log("Calling Preload Handlebars");
  return loadTemplates([
    // Chat Partials
    `systems/${game.system.id}/templates/chat/cpr-base-rollcard.hbs`,
    `systems/${game.system.id}/templates/chat/cpr-damage-rollcard.hbs`,
    `systems/${game.system.id}/templates/chat/cpr-damage-application-card.hbs`,

    // Dialog Partials
    `systems/${game.system.id}/templates/dialog/cpr-confirmation-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-damage-application-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-dialog-buttons.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-install-cyberware-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-ledger-deletion-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-ledger-edit-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-ledger-form.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-load-ammo-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-mod-mook-skill-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-mook-name-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-role-ability-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-roll-critical-injury-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-select-compatible-ammo-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-select-role-bonuses-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-split-item-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-update-announcement.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-universal-roll-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-cyberdeck-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-damage-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-deathsave-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-generic-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-roleAbility-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-skill-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-stat-prompt.hbs`,

    // Left Pane Actor Partials
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-deathsave-block.hbs`,
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-handle-block.hbs`,
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-hitpoint-block.hbs`,
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-humanity-block.hbs`,
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-image-block.hbs`,
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-ip-block.hbs`,
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-role-block.hbs`,
    `systems/${game.system.id}/templates/actor/parts/left-pane/cpr-stat-block.hbs`,

    // Right Pane Actor Partials
    `systems/${game.system.id}/templates/actor/parts/right-pane/cpr-cyberware.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/cpr-effects.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/cpr-gear.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/cpr-skills.hbs`,

    // Bottom Pane Actor Partials
    `systems/${game.system.id}/templates/actor/parts/bottom-pane/cpr-fight.hbs`,
    `systems/${game.system.id}/templates/actor/parts/bottom-pane/cpr-lifepath.hbs`,
    `systems/${game.system.id}/templates/actor/parts/bottom-pane/cpr-role.hbs`,

    // Skill Tab Partials
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/skills/cpr-skills-category.hbs`,

    // Gear Tab Partials
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-ammo-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-armor-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-clothing-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-cyberdeck-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-cyberware-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-cyberware-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-drug-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-gear-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-itemUpgrade-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-program-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-program-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-vehicle-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/gear/cpr-weapon-content.hbs`,

    // Cyberware Tab Partials
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/cyberware/cpr-cyberware-content.hbs`,
    `systems/${game.system.id}/templates/actor/parts/right-pane/parts/cyberware/cpr-cyberware-header.hbs`,

    // Common Partials - Actions
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-actions.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-dv-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-equip-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-install-cyberware-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-install-programs-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-reload-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-repair-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-snort-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-split-item.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-uninstall-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/parts/common/actions/cpr-upgrade-glyph.hbs`,

    // Debug
    `systems/${game.system.id}/templates/actor/parts/debug/cpr-item-debug.hbs`,
    `systems/${game.system.id}/templates/actor/work-in-progress.hbs`,

    // Mook Sheet Partials
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-armor.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-criticalInjury.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-gear.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-image.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-program.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-sheet-limited.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-skills.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-stats.hbs`,
    `systems/${game.system.id}/templates/actor/mooks/cpr-mook-weapons.hbs`,

    // Container Sheet
    `systems/${game.system.id}/templates/actor/container/cpr-container-actions.hbs`,
    `systems/${game.system.id}/templates/actor/container/cpr-item-content.hbs`,
    `systems/${game.system.id}/templates/actor/cpr-container-sheet.hbs`,

    // Item Sheet
    `systems/${game.system.id}/templates/item/cpr-item-sheet.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-description.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-settings.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-name.hbs`,

    // Item Sheet Partials
    // Description Mixins
    `systems/${game.system.id}/templates/item/description/mixin/cpr-attackable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-effects.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-equippable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-loadable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-installable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-physical.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-stackable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-upgradable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-valuable.hbs`,

    // Description Types
    `systems/${game.system.id}/templates/item/description/cpr-ammo.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-armor.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-clothing.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-criticalInjury.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-cyberdeck.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-cyberware.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-drug.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-gear.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-itemUpgrade.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-netarch.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-program.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-role.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-skill.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-vehicle.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-weapon.hbs`,

    // Setting Mixins
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-attackable.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-effects.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-equippable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-loadable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-installable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-physical.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-stackable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-upgradable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-valuable.hbs`,

    // Setting Types
    `systems/${game.system.id}/templates/item/settings/cpr-ammo.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-armor.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-clothing.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-criticalInjury.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-cyberdeck.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-cyberware.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-drug.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-gear.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-itemUpgrade.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-netarch.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-program.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-role.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-skill.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-vehicle.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-weapon.hbs`,

    // Active Effects Sheet
    `systems/${game.system.id}/templates/effects/cpr-active-effect-sheet.hbs`,
  ]);
}
