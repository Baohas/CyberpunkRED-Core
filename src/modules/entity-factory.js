// Actors
import CPRActor from "./actor/cpr-actor.js";
import CPRBlackIceActor from "./actor/cpr-black-ice.js";
import CPRCharacterActor from "./actor/cpr-character.js";
import CPRContainerActor from "./actor/cpr-container.js";
import CPRDemonActor from "./actor/cpr-demon.js";
import CPRMookActor from "./actor/cpr-mook.js";
import CPRItem from "./item/cpr-item.js";

// Items
import CPRAmmoItem from "./item/types/cpr-ammo.js";
import CPRArmorItem from "./item/types/cpr-armor.js";
import CPRClothingItem from "./item/types/cpr-clothing.js";
import CPRCyberdeckItem from "./item/types/cpr-cyberdeck.js";
import CPRCyberwareItem from "./item/types/cpr-cyberware.js";
import CPRDrugItem from "./item/types/cpr-drug.js";
import CPRGearItem from "./item/types/cpr-gear.js";
import CPRCriticalInjuryItem from "./item/types/cpr-injury.js";
import CPRNetArchItem from "./item/types/cpr-netarch.js";
import CPRProgramItem from "./item/types/cpr-program.js";
import CPRRoleItem from "./item/types/cpr-role.js";
import CPRSkillItem from "./item/types/cpr-skill.js";
import CPRUpgradeItem from "./item/types/cpr-upgrade.js";
import CPRVehicleItem from "./item/types/cpr-vehicle.js";
import CPRWeaponItem from "./item/types/cpr-weapon.js";

// Utilities
import { validateOverride } from "./system/overrides.js";

/**
 * Borrowed from the Burning Wheel system: a Proxy that stands in for the single allowed
 * `CONFIG.<Document>.documentClass` and dispatches construction to the per-type subclass by
 * `data.type`. Assigned to `CONFIG.Actor.documentClass` / `CONFIG.Item.documentClass` in cpr.js.
 *
 * The `construct` trap does the dispatch: Foundry constructs every document through the configured
 * documentClass (this Proxy), so routing there covers create/import/duplication alike, and per-type
 * create-time setup (token defaults, core-item population) lives in each subclass's `_preCreate`. The
 * `get` trap only survives to provide a type-aware `Symbol.hasInstance` (see below) — everything else
 * forwards to the base class.
 *
 * Beware, a lot of this code is inspected (loaded) when Foundry is initializing, so any code
 * that depends on basic things like system settings will not work. During that time they do
 * not exist yet.
 *
 * @param {object} entities - a mapping of document types to their subclasses
 * @param {Function} baseClass - the base Foundry Actor/Item class the Proxy fronts
 * @returns {Proxy} a Proxy that routes construction to the correct subclass by type
 */
function factory(entities, baseClass) {
  return new Proxy(baseClass, {
    construct: (target, args) => {
      const [data, options] = args;
      const constructor = entities[data.type];
      if (!constructor)
        throw new Error(`Unsupported Entity type for create(): ${data.type}`);

      // Override the validate() function to suppress validation if migration is happening.
      constructor.prototype.validate = validateOverride;
      return new constructor(data, options);
    },
    // Foundry validates collection pushes with `instance instanceof CONFIG.<Doc>.documentClass`
    // (this Proxy). Container/Black-ICE/Demon still extend Foundry `Actor` directly rather than the
    // Proxy's baseClass (CPRActor), so a type-aware `instanceof` is required — without it their
    // creation is rejected ("You may only push instances of Actor to the Actors collection"). Every
    // other property forwards to the base class. Once all actor types extend CPRActor this trap can
    // go and native `instanceof` suffices (the pf2e model).
    get: (target, prop) => {
      if (prop === Symbol.hasInstance) {
        return (instance) => {
          const constructor = entities[instance.type];
          return constructor ? instance instanceof constructor : false;
        };
      }
      return baseClass[prop];
    },
  });
}

const actorTypes = {};
actorTypes.blackIce = CPRBlackIceActor;
actorTypes.character = CPRCharacterActor;
actorTypes.container = CPRContainerActor;
actorTypes.demon = CPRDemonActor;
actorTypes.mook = CPRMookActor;
export const actorConstructor = factory(actorTypes, CPRActor);

const itemTypes = {};
itemTypes.ammo = CPRAmmoItem;
itemTypes.armor = CPRArmorItem;
itemTypes.clothing = CPRClothingItem;
itemTypes.criticalInjury = CPRCriticalInjuryItem;
itemTypes.cyberdeck = CPRCyberdeckItem;
itemTypes.cyberware = CPRCyberwareItem;
itemTypes.drug = CPRDrugItem;
itemTypes.gear = CPRGearItem;
itemTypes.itemUpgrade = CPRUpgradeItem;
itemTypes.netarch = CPRNetArchItem;
itemTypes.program = CPRProgramItem;
itemTypes.role = CPRRoleItem;
itemTypes.skill = CPRSkillItem;
itemTypes.vehicle = CPRVehicleItem;
itemTypes.weapon = CPRWeaponItem;
export const itemConstructor = factory(itemTypes, CPRItem);
