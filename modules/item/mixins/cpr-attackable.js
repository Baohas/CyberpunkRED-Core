import * as CPRRolls from "../../rolls/cpr-rolls.js";
import LOGGER from "../../utils/cpr-logger.js";
import Rules from "../../utils/cpr-rules.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * The Attackable mixin is for items that can be attacked with, usually guns and
 * melee weapons. Since melee and ranged weapons are the same item type,
 * it makes sense to keep all weapon logic together in "Attackable."
 */
const Attackable = function Attackable() {
  /**
   * Dispatcher method for interacting with the attackable item. Most of these methods are implemented
   * in the Loadable mixin. Note that this cannot be implemented in the weapon item code because
   * cyberware can also be a "weapon."
   *
   * @async
   * @callback
   * @param {CPRActor} actor  - who is doing something with this weapon?
   * @param {*} actionAttributes - details from the event indicating what the actor is doing
   */
  this._weaponAction = async function _weaponAction(actor, actionAttributes) {
    LOGGER.trace("_weaponAction | CPRWeaponItem | Called.");
    const actionData = actionAttributes["data-action"].nodeValue;
    switch (actionData) {
      case "select-ammo":
        this._loadItem();
        break;
      case "unload":
        this._unloadItem();
        break;
      case "load":
        this._loadItem();
        break;
      case "reload-ammo":
        this._loadItem(this.data.data.magazine.ammoId);
        break;
      case "measure-dv":
        this._measureDv(actor, this.data.data.dvTable);
        break;
      default:
    }
    if (this.actor) {
      this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, data: this.data.data }]);
    }
  };

  /**
   * reduces the ammo count for this item after firing it
   *
   * @returns updated actor data
   */
  this.dischargeItem = function dischargeItem(cprRoll) {
    LOGGER.trace("dischargeItem | Attackable | Called.");
    const discharged = this.bulletConsumption(cprRoll);
    LOGGER.debug(discharged);
    // don't go negative
    this.data.data.magazine.value = Math.max(this.data.data.magazine.value - discharged, 0);
    return this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, data: this.data.data }]);
  };

  /**
   * Creates a CPRAttackRoll object for the item. Does not actually "roll" it.
   *
   * @param {String} type - type of attack (normal, suppressive, autofire, etc)
   * @param {CPRActor} actor - who is attacking?
   * @returns {CPRAttackRoll}
   */
  this._createAttackRoll = function _createAttackRoll(type, actor) {
    LOGGER.trace("_createAttackRoll | Attackable | Called.");
    const weaponData = this.data.data;
    const weaponName = this.name;
    const { weaponType } = weaponData;
    let skillItem = actor.items.find((i) => i.name === weaponData.weaponSkill);

    if (type === CPRRolls.rollTypes.SUPPRESSIVE || type === CPRRolls.rollTypes.AUTOFIRE) {
      skillItem = actor.items.find((i) => i.name === "Autofire");
      if (!this.data.data.fireModes.suppressiveFire) {
        if (this.data.data.weaponType !== "smg" && this.data.data.weaponType !== "heavySmg" && this.data.data.weaponType !== "assaultRifle") {
          Rules.lawyer(false, "CPR.messages.weaponDoesntSupportAltMode");
        }
      }
    }

    const skillName = skillItem.data.name;
    // total up bonuses from skills and stats
    const skillValue = actor.getSkillLevel(weaponData.weaponSkill);
    const skillMod = actor.getSkillMod(weaponData.weaponSkill);
    let cprRoll;
    let statName;
    if (weaponData.isRanged && this.data.data.weaponType !== "thrownWeapon") {
      statName = "ref";
    } else {
      statName = "dex";
    }

    // total up skill bonuses from role abilities and subRole abilities
    const niceStatName = SystemUtils.Localize(`CPR.global.stats.${statName}`);
    const statValue = actor.getStat(statName);
    let roleName;
    let roleValue = 0;

    actor.data.filteredItems.role.forEach((r) => {
      const [rn, rv] = r.getSkillBonuses(skillName);
      if (rn) {
        if (roleName) {
          roleName += `, ${rn}`;
        } else {
          roleName = rn;
        }
        roleValue += rv;
      }
    });

    // total up attack bonuses directly from role abilities (not indirectly from skills)
    let universalBonusAttack = 0;
    this.actor.data.filteredItems.role.forEach((r) => {
      if (r.data.data.universalBonuses.includes("attack")) {
        universalBonusAttack += Math.floor(r.data.data.rank / r.data.data.bonusRatio);
      }
      const subroleUniversalBonuses = r.data.data.abilities.filter((a) => a.universalBonuses.includes("attack"));
      if (subroleUniversalBonuses.length > 0) {
        subroleUniversalBonuses.forEach((b) => {
          universalBonusAttack += Math.floor(b.rank / b.bonusRatio);
        });
      }
    });

    // finally, total up active effects improving attacks
    universalBonusAttack += this.actor.data.bonuses.universalAttack;

    switch (type) {
      case CPRRolls.rollTypes.AIMED: {
        cprRoll = new CPRRolls.CPRAimedAttackRoll(weaponName, niceStatName, statValue, skillName, skillValue, roleName, roleValue, weaponType, universalBonusAttack);
        break;
      }
      case CPRRolls.rollTypes.AUTOFIRE: {
        cprRoll = new CPRRolls.CPRAutofireRoll(weaponName, niceStatName, statValue, skillName, skillValue, roleName, roleValue, weaponType, universalBonusAttack);
        break;
      }
      case CPRRolls.rollTypes.SUPPRESSIVE: {
        cprRoll = new CPRRolls.CPRSuppressiveFireRoll(weaponName, niceStatName, statValue, skillName, skillValue, roleName, roleValue, weaponType, universalBonusAttack);
        break;
      }
      default:
        cprRoll = new CPRRolls.CPRAttackRoll(weaponName, niceStatName, statValue, skillName, skillValue, roleName, roleValue, weaponType, universalBonusAttack);
    }

    // apply other known mods
    cprRoll.addMod(actor.getArmorPenaltyMods(statName));
    cprRoll.addMod(actor.getWoundStateMods());
    cprRoll.addMod(skillMod);

    if (cprRoll instanceof CPRRolls.CPRAttackRoll && weaponData.isRanged) {
      Rules.lawyer(this.hasAmmo(cprRoll), "CPR.messages.weaponAttackOutOfBullets");
    }
    return cprRoll;
  };

  /**
   * Creates a CPRDamageRoll object for the item. Does not actually "roll" it.
   *
   * @param {String} type - type of attack (autofire, etc)
   * @returns {CPRDamageRoll}
   */
  this._createDamageRoll = function _createDamageRoll(type) {
    LOGGER.trace("_createDamageRoll | Attackable | Called.");
    const rollName = this.data.name;
    const { weaponType } = this.data.data;
    let { damage } = this.data.data;
    let universalBonusDamage = 0;
    if ((weaponType === "unarmed" || weaponType === "martialArts") && this.data.data.unarmedAutomaticCalculation) {
      // calculate damage based on BODY stat
      const actorBodyStat = this.actor.data.data.stats.body.value;
      if (actorBodyStat <= 4) {
        if (weaponType === "unarmed" && this.actor.data.filteredItems.cyberware.some((c) => (
          (c.data.data.type === "cyberArm") && (c.data.data.isInstalled === true) && (c.data.data.isFoundational === true)))) {
          // If the user has an installed Cyberarm, which is a foundational. This is only for unarmed damage, not martial arts damage.
          damage = "2d6";
        } else {
          damage = "1d6";
        }
      } else if (actorBodyStat <= 6) {
        damage = "2d6";
      } else if (actorBodyStat <= 10) {
        damage = "3d6";
      } else {
        damage = "4d6";
      }
    }

    // consider damage bonuses coming from role abilties
    this.actor.data.filteredItems.role.forEach((r) => {
      if (r.data.data.universalBonuses.includes("damage")) {
        universalBonusDamage += Math.floor(r.data.data.rank / r.data.data.bonusRatio);
      }
      const subroleUniversalBonuses = r.data.data.abilities.filter((a) => a.universalBonuses.includes("damage"));
      if (subroleUniversalBonuses.length > 0) {
        subroleUniversalBonuses.forEach((b) => {
          universalBonusDamage += Math.floor(b.rank / b.bonusRatio);
        });
      }
    });

    // finally, total up active effects improving attacks
    universalBonusDamage += this.actor.data.bonuses.universalDamage;

    const cprRoll = new CPRRolls.CPRDamageRoll(rollName, damage, weaponType, universalBonusDamage);
    if (this.data.data.fireModes.autoFire === 0 && (
      (this.data.data.weaponType === "smg" || this.data.data.weaponType === "heavySmg" || this.data.data.weaponType === "assaultRifle"))) {
      this.data.data.fireModes.autoFire = this.data.data.weaponType === "assaultRifle" ? 4 : 3;
    }

    cprRoll.configureAutofire(1, this.data.data.fireModes.autoFire);

    switch (type) {
      case CPRRolls.rollTypes.AIMED: {
        cprRoll.isAimed = true;
        break;
      }
      case CPRRolls.rollTypes.AUTOFIRE: {
        cprRoll.setAutofire();
        break;
      }
      default:
    }

    // Feed ammo type and variety into the rollCard arguments for the damage application button.
    if (this.data.data.isRanged) {
      const ammoType = this._getLoadedAmmoType();
      const ammoVariety = this._getLoadedAmmoVariety();
      if (ammoType !== "undefined") {
        cprRoll.rollCardExtraArgs.ammoType = ammoType;
      }
      if (ammoVariety !== "undefined") {
        cprRoll.rollCardExtraArgs.ammoVariety = ammoVariety;
      }
    }

    const halfArmorAttacks = [
      "lightMelee",
      "medMelee",
      "heavyMelee",
      "vHeavyMelee",
      "martialArts",
    ];
    if (halfArmorAttacks.includes(weaponType)) {
      cprRoll.rollCardExtraArgs.ignoreHalfArmor = true;
    }
    const upgradeType = this.getUpgradeTypeFor("damage");
    const upgradeValue = this.getAllUpgradesFor("damage");
    if (upgradeType === "override") {
      cprRoll.formula = "0d6";
    }
    cprRoll.addMod(upgradeValue);

    return cprRoll;
  };

  /**
   * Get mods to the attack roll from upgrades. You might think this could be removed in favor of
   * active effects, but alas, we cannot. Active Effects can only affect the item it is on, or
   * the actors that own said item. (or actors themselves). An AE cannot by applied to a different
   * item. In other words, an itemUpgrade cannot provide an AE that affects the item it is installed
   * into. Therefore, we have to use this attackmod property instead.
   *
   * @returns {Number}
   */
  this._getAttackMod = function _getAttackMod() {
    LOGGER.trace("_getAttackMod | Attackable | Called.");
    let returnValue = 0;
    switch (this.type) {
      case "weapon": {
        if (typeof this.data.data.attackmod !== "undefined") {
          returnValue = this.data.data.attackmod;
        }
        break;
      }
      default:
    }
    const upgradeValue = this.getAllUpgradesFor("attackmod");
    const upgradeType = this.getUpgradeTypeFor("attackmod");
    returnValue = (upgradeType === "override") ? upgradeValue : returnValue + upgradeValue;
    return returnValue;
  };
};

export default Attackable;
