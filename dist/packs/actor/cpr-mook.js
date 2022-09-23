import CPRActor from "./cpr-actor.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

/**
 * The mook actor extends CPRActor since there is a lot of overlap behind the scenes with the
 * way items interact and how stats and skills are used.
 *
 * @extends {Actor}
 */
export default class CPRMookActor extends CPRActor {
  /**
   * Like characters, we extend the create() method to set HP as the default resource bar, set some other
   * token defaults, and pre-populate the actor with skills, cyberware, and other "items."
   *
   * @param {Object} data - data used in creating a basic mook
   * @param {Object} options - not used here but passed up to the parent class
   */
  static async create(data, options) {
    LOGGER.trace("create | CPRMookActor | called.");
    const createData = data;
    if (typeof data.system === "undefined") {
      LOGGER.trace("create | New Actor | CPRMookActor | called.");
      createData.items = [];
      const tmpItems = data.items.concat(await SystemUtils.GetCoreSkills(), await SystemUtils.GetCoreCyberware());
      tmpItems.forEach((item) => {
        const cprItem = {
          name: item.name,
          img: item.img,
          type: item.type,
          system: item.system,
        };
        createData.items.push(cprItem);
      });
      createData.token = {
        vision: true,
        bar1: { attribute: "derivedStats.hp" },
      };
    }
    super.create(createData, options);
  }

  /**
   * Set the mook's name, called from the sheet.
   *
   * @param {Object} formData - an object representing what was typed in the mook-name dialog
   * @returns {Object}
   */
  setMookName(formData) {
    LOGGER.trace("setMookName | CPRMookActor | called.");
    return this.update(formData);
  }

  /**
   * Automatically calculate "derived" stats based on changes to other stats like we do with
   * characters. This code intentionally omits Humanity.
   */
  _calculateDerivedStats() {
    LOGGER.trace("_calculateDerivedStats | CPRMookActor | Called.");
    const cprData = this.system;
    const { derivedStats } = cprData;
    derivedStats.seriouslyWounded = Math.ceil(derivedStats.hp.max / 2);

    // We need to always call this because if the actor was wounded and now is not, their
    // value would be equal to max, however their current wound state was never updated.
    this._setWoundState();
    derivedStats.currentWoundState = this.system.derivedStats.currentWoundState;

    // Death save
    let basePenalty = 0;
    const critInjury = this.itemTypes.criticalInjury;
    critInjury.forEach((criticalInjury) => {
      const { deathSaveIncrease } = criticalInjury.system;
      if (deathSaveIncrease) {
        basePenalty += 1;
      }
    });
    // In 0.73.2 we moved all of the Death Save data into the single data point of
    // derivedStats.deathSave.basePenalty, however, it causes a chicken/egg situation
    // since it loads the data up before it migrates, triggering this code to run which
    // errors out and ultimately messing the migration up. Yay. We should be able to
    // remove this code after a release or two
    if ((typeof derivedStats.deathSave) === "number") {
      const oldPenalty = derivedStats.deathSave;
      derivedStats.deathSave = {
        value: 0,
        penalty: oldPenalty,
        basePenalty,
      };
    }
    derivedStats.deathSave.basePenalty = basePenalty;
    derivedStats.deathSave.value = derivedStats.deathSave.penalty + derivedStats.deathSave.basePenalty;
    this.system.derivedStats = derivedStats;
  }

  /**
   * Called by the createOwnedItem listener (hook) when a user drags an item on a mook sheet
   * It handles the automatic equipping of gear and installation of cyberware.
   *
   * @param {CPRItem} item - the item that was dragged
   */
  handleMookDraggedItem(item) {
    LOGGER.trace("handleMookDraggedItem | CPRActor | Called.");
    LOGGER.debug("auto-equipping or installing a dragged item to the mook sheet");
    switch (item.type) {
      case "clothing":
      case "weapon":
      case "gear":
      case "armor": {
        // chose change done for 0.8.x, and not the fix from dev, as it seems to work without it.
        this.updateEmbeddedDocuments("Item", [{ _id: item._id, "system.equipped": "equipped" }]);
        break;
      }
      case "cyberware": {
        this.addCyberware(item._id);
        break;
      }
      default:
    }
  }
}
