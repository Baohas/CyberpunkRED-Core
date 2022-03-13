/* global Handlebars game getProperty */
import LOGGER from "../utils/cpr-logger.js";
import CPR from "./config.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default function registerHandlebarsHelpers() {
  LOGGER.log("Calling Register Handlebars Helpers");

  /**
   * Run a comparison given a stringified operator and 2 operands. Returns true or false.
   */
  Handlebars.registerHelper("cprCompare", (v1, operator, v2) => {
    LOGGER.trace("cprCompare | handlebarsHelper | Called.");
    switch (operator) {
      case "==":
        return v1 == v2; // eslint-disable-line eqeqeq
      case "===":
        return v1 === v2;
      case "!==":
        return v1 !== v2;
      case "<":
        return v1 < v2;
      case "<=":
        return v1 <= v2;
      case ">":
        return v1 > v2;
      case ">=":
        return v1 >= v2;
      case "&&":
        return v1 && v2;
      case "||":
        return v1 || v2;
      default:
        return false;
    }
  });

  /**
   * Get the value of a property on a given object
   */
  Handlebars.registerHelper("cprGetProp", (object, property) => {
    LOGGER.trace("cprGetProp | handlebarsHelper | Called.");
    if (typeof object !== "undefined") {
      if (typeof object.length === "undefined") {
        return getProperty(object, property);
      }
      if (object.length > 0) {
        const returnValues = [];
        object.forEach((obj) => {
          returnValues.push(getProperty(obj, property));
        });
        return returnValues;
      }
    }
    return "";
  });

  /**
   * Return an owned item on an actor given the ID
   */
  Handlebars.registerHelper("cprGetOwnedItem", (actor, itemId) => actor.items.find((i) => i.id === itemId));

  /**
   * Return true if an object is defined or not
   */
  Handlebars.registerHelper("cprIsDefined", (object) => {
    LOGGER.trace("cprIsDefined | handlebarsHelper | Called.");
    if (typeof object === "undefined") {
      return false;
    }
    return true;
  });

  /**
   * Check if the passed object is "empty", meaning has no elements or properties
   */
  Handlebars.registerHelper("cprIsEmpty", (object) => {
    LOGGER.trace("cprIsEmpty | handlebarsHelper | Called.");
    if (typeof object === "object") {
      if (Array.isArray(object)) {
        if (object.length === 0) {
          return true;
        }
      } else if (Object.keys(object).length === 0) {
        return true;
      }
    }
    return false;
  });

  /**
   * Return true if a literal is a number
   */
  Handlebars.registerHelper("cprIsNumber", (value) => !Number.isNaN(value));

  /**
   * Given an Array of strings, create an object with those strings as properties. They are the assigned
   * in order to the remaining arguments passed to this helper.
   */
  Handlebars.registerHelper("cprMergeForPartialArg", (...args) => {
    LOGGER.trace("cprMergeForPartialArg | handlebarsHelper | Called.");
    const partialArgs = [...args];
    const partialKeys = partialArgs[0].replace(/\s/g, "").split(",");
    partialArgs.shift();
    const mergedObject = {};
    let index = 0;
    partialKeys.forEach((objectName) => {
      mergedObject[objectName] = partialArgs[index];
      index += 1;
    });
    return mergedObject;
  });

  /**
   * Given a list of objects, return the subset that a property with the desired value
   */
  Handlebars.registerHelper("cprFilter", (objList, key, value) => {
    LOGGER.trace("cprFilter | handlebarsHelper | Called.");
    if (objList === undefined) {
      const warnText = "Improper use of the filter helper. This should not occur. Always provide an object list and not an undefined value.";
      LOGGER.warn(`${warnText} The following arguments were passed: objList = ${objList}, key = ${key}, value = ${value}`);
      return [];
    }
    const filteredList = objList.filter((obj) => {
      let objProp = obj;
      const propDepth = key.split(".");
      // eslint-disable-next-line consistent-return
      propDepth.forEach((propName) => {
        if (typeof objProp[propName] !== "undefined") {
          objProp = objProp[propName];
        } else {
          return false;
        }
      });
      if (objProp === value) {
        return true;
      }
      return false;
    });
    return filteredList;
  });

  /**
   * Calculate the price of a stack of items. This is amount * price with
   * a few exceptions.
   */
  Handlebars.registerHelper("cprCalculateStackValue", (item) => {
    LOGGER.trace("cprCalculateStackValue | handlebarsHelper | Called.");
    const { type } = item;
    const price = item.data.data.price.market;
    const { amount } = item.data.data;
    let totalPrice = amount * price;
    if (type === "ammo") {
      const { variety } = item.data.data;
      if (!(variety === "grenade" || variety === "rocket")) {
        totalPrice = (amount / 10) * price;
      }
    }
    return totalPrice;
  });

  /**
   * Get a config mapping from config.js by name and key
   */
  Handlebars.registerHelper("cprFindConfigValue", (obj, key) => {
    LOGGER.trace("cprFindConfigValue | handlebarsHelper | Called.");
    if (obj in CPR) {
      return CPR[obj][key];
    }
    return "INVALID_KEY";
  });

  /**
   * Get a config mapping from config.js by name
   */
  Handlebars.registerHelper("cprFindConfigObj", (obj) => {
    LOGGER.trace("cprFindConfigObj | handlebarsHelper | Called.");
    if (obj in CPR) {
      return CPR[obj];
    }
    return "INVALID_LIST";
  });

  /**
   * Show option slots on a cyberware item
   */
  Handlebars.registerHelper("cprShowOptionSlotStatus", (obj) => {
    LOGGER.trace("cprShowOptionSlotStatus | handlebarsHelper | Called.");
    if (obj.type === "cyberware") {
      const { optionSlots } = obj.data.data;
      if (optionSlots > 0) {
        LOGGER.trace(`hasOptionalSlots is greater than 0`);
        const installedOptionSlots = optionSlots - obj.availableSlots();
        return (`- ${installedOptionSlots}/${optionSlots} ${SystemUtils.Localize("CPR.itemSheet.cyberware.optionalSlots")}`);
      }
      LOGGER.trace(`hasOptionalSlots is 0`);
    }
    return "";
  });

  /**
   * This helper accepts a string that is a list of words separated by strings. It returns true if
   * any of them match a given value.
   */
  Handlebars.registerHelper("cprListContains", (list, val) => {
    LOGGER.trace("cprListContains | handlebarsHelper | Called.");
    let array = list;
    if (array) {
      switch (typeof array) {
        case "string": {
          array = array.split(",");
          break;
        }
        case "object": {
          if (!Array.isArray(array)) {
            array = Object.keys(array);
          }
          break;
        }
        default:
      }
      return array.includes(val);
    }
    return false;
  });

  /**
   * Returns true if an array contains a desired element
   */
  Handlebars.registerHelper("cprObjectListContains", (objectList, data, val) => {
    LOGGER.trace("cprObjectListContains | handlebarsHelper | Called.");
    const array = objectList;
    if (array) {
      return array.some((o) => o[data] === val);
    }
    return false;
  });

  /**
   * Accepts a string and replaces VAR with the desired value. Usually used to dynamically
   * produce file names for partial templates.
   */
  Handlebars.registerHelper("cprGeneratePartial", (arg1, arg2) => {
    LOGGER.trace("cprGeneratePartial | handlebarsHelper | Called.");
    return arg1.replace("VAR", arg2);
  });

  /**
   * Calculate the size (in pixels) of images for dice given the number of sides they have
   * and how many need to be displayed in a chat card.
   */
  Handlebars.registerHelper("cprDiceSizeImageClass", (formula) => {
    LOGGER.trace("cprDiceSizeImageClass | handlebarsHelper | Called.");
    let diceSize = "";
    let className = "d10";
    const formulaParts = formula.split("d");
    if (formulaParts.length === 2) {
      const diceCount = parseInt(formulaParts[0], 10);
      const diceSides = parseInt(formulaParts[1], 10);
      className = `d${diceSides}`;

      if (diceSides === 6) {
        diceSize = 60;
        if (diceCount > 2) {
          diceSize = 40;
        }
        if (diceCount > 4) {
          diceSize = 30;
        }
        if (diceCount > 10) {
          diceSize = 20;
        }
      }

      if (diceSides === 10) {
        diceSize = 60;
        if (diceCount > 2) {
          diceSize = 40;
        }
        if (diceCount > 4) {
          diceSize = 30;
        }
        if (diceCount > 10) {
          diceSize = 20;
        }
      }
      if (diceSize) {
        className = `${className} ${className}-${diceSize}`;
      }
    }
    return className;
  });

  /**
   * Sort an array of objects by the values in a specific property
   */
  Handlebars.registerHelper("cprSort", (arr, property) => {
    LOGGER.trace("cprSort | handlebarsHelper | Called.");
    arr.sort((a, b) => {
      let comparator = 0;
      if (a[property] > b[property]) {
        comparator = 1;
      } else if (b[property] > a[property]) {
        comparator = -1;
      }
      return comparator;
    });
    return arr;
  });

  /**
   * Return an array in reverse order
   */
  Handlebars.registerHelper("cprReverse", (arr) => {
    LOGGER.trace("cprReverse | handlebarsHelper | Called.");
    arr.reverse();
    return arr;
  });

  /**
   * Perform a basic mathematical statement starting with a stringified
   * operator and an array of operands
   */
  Handlebars.registerHelper("cprMath", (...args) => {
    LOGGER.trace("cprMath | handlebarsHelper | Called.");
    let mathArgs = [...args];
    let mathFunction = mathArgs[0];
    mathArgs.shift();
    mathArgs.pop();
    if (Array.isArray(mathArgs[0])) {
      [mathArgs] = mathArgs;
    }
    mathArgs = mathArgs.map(Number);
    if (typeof Math[mathFunction] === "function") {
      return Math[mathFunction].apply(null, mathArgs);
    }
    // Math doesn't have basic functions, we can account
    // for those here as needed:
    if (typeof mathArgs === "undefined") {
      mathFunction = `${mathFunction} bad args: ${mathArgs}`;
    }
    switch (mathFunction) {
      case "sum":
        return mathArgs.reduce((a, b) => a + b, 0);
      case "subtract": {
        const minutend = mathArgs.shift();
        const subtrahend = mathArgs.reduce((a, b) => a + b, 0);
        return minutend - subtrahend;
      }
      case "product": {
        return mathArgs.reduce((a, b) => a * b, 1);
      }
      default:
        LOGGER.error(`!ERR: Not a Math function: ${mathFunction}`);
        return "null";
    }
  });

  /**
   * Given a skill (item), return the stat associated with it, which is a property buried therein
   */
  Handlebars.registerHelper("cprGetSkillStat", (skill, actor) => {
    LOGGER.trace("cprGetSkillStat | handlebarsHelper | Called.");
    const skillStat = skill.data.data.stat;
    return actor.data.data.stats[skillStat].value;
  });

  /**
   * Return true if any installed cyberware is a weapon
   */
  Handlebars.registerHelper("cprHasCyberneticWeapons", (actor) => {
    LOGGER.trace("cprHasCyberneticWeapons | handlebarsHelper | Called.");
    let returnValue = false;
    const cyberware = actor.getInstalledCyberware();
    cyberware.forEach((cw) => {
      if (cw.data.data.isWeapon === "true") {
        returnValue = true;
      }
    });
    return returnValue;
  });

  /**
   * Return true if an embedded flag on an actor matches the firemode currently set.
   * Used to figure out if a weapon was just used with an alternative fire mode set.
   */
  Handlebars.registerHelper("cprFireMode", (actor, firemode, weaponID) => {
    LOGGER.trace("cprFireMode | handlebarsHelper | Called.");
    const flag = getProperty(actor, `data.flags.cyberpunk-red-core.firetype-${weaponID}`);
    if (flag === firemode) {
      return true;
    }
    return false;
  });

  /**
   * Get the fire type selected for an owned weapon. This is stored as a flag on an actor.
   */
  Handlebars.registerHelper("cprFireFlag", (actor, firetype, weaponID) => {
    LOGGER.trace("cprFireFlag | handlebarsHelper | Called.");
    const flag = getProperty(actor, `data.flags.cyberpunk-red-core.firetype-${weaponID}`);
    if (flag === firetype) {
      return "checked";
    }
    return "";
  });

  /**
   * Return a system setting value given the name
   */
  Handlebars.registerHelper("cprSystemConfig", (settingName) => game.settings.get("cyberpunk-red-core", settingName));

  /**
   * Some skills and roles have spaces and/or parantheses in their name. When substituting in translated strings,
   * this can be a problem to find the key they're listed under.
   *
   * Example: Resist Torture/Drugs -> Resist Torture Or Drugs
   */
  Handlebars.registerHelper("cprSplitJoinCoreSkills", (skillObj) => {
    LOGGER.trace("cprSplitJoinCoreSkills | handlebarsHelper | Called.");
    return "CPR.global.skills.".concat(SystemUtils.slugify(skillObj.name));
  });

  /**
   * Sort core skills, returning a new array. This goes a step further and considers unicode normalization form for
   * specific characters like slashes and parantheses.
   */
  Handlebars.registerHelper("cprSortCoreSkills", (skillObjArray) => {
    LOGGER.trace("cprSortCoreSkills | handlebarsHelper | Called.");
    const sortedSkills = [];
    skillObjArray.forEach((o) => {
      const newElement = o;
      if (o.data.data.core) {
        const tstring = "CPR.global.skills.".concat(SystemUtils.slugify(o.name));
        newElement.translatedName = SystemUtils.Localize(tstring).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      } else {
        newElement.translatedName = o.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
      sortedSkills.push(newElement);
    });

    sortedSkills.sort((a, b) => {
      let comparator = 0;
      if (a.translatedName > b.translatedName) {
        comparator = 1;
      } else if (b.translatedName > a.translatedName) {
        comparator = -1;
      }
      return comparator;
    });
    return sortedSkills;
  });

  /**
   * Get an Item ID from the catalog by name and type. Does not consider owned items.
   */
  Handlebars.registerHelper("cprItemIdFromName", (itemName, itemType) => {
    LOGGER.trace("cprItemIdFromName | handlebarsHelper | Called.");
    const item = game.items.find((i) => i.data.name === itemName && i.type === itemType);
    if (item !== undefined) {
      return item.data._id;
    }
    return "DOES NOT EXIST";
  });

  /**
   * Convert a string with a delimiter (such as a comma or space) to an Array of elements
   */
  Handlebars.registerHelper("cprToArray", (string, delimiter) => string.split(delimiter));

  /**
   * Concatenate 1 object to another with the concat method.
   */
  Handlebars.registerHelper("cprObjConcat", (obj1, obj2) => {
    LOGGER.trace("cprObjConcat | handlebarsHelper | Called.");
    const obj = obj1.concat(obj2);
    return obj;
  });

  /**
   * Get all skills on a mook that have a level above 0. This is used to present
   * specialized skills a mook may have.
   */
  Handlebars.registerHelper("cprGetMookSkills", (array) => {
    LOGGER.trace("cprGetMookSkills | handlebarsHelper | Called.");
    const skillList = [];
    array.forEach((skill) => {
      if (skill.data.data.level > 0 || skill.data.data.skillmod > 0) {
        skillList.push(skill);
      }
    });
    return skillList;
  });

  /**
   * Get all installed cyberware and options and return it as an array. This is
   * used in the mook sheet.
   */
  Handlebars.registerHelper("cprGetMookCyberware", (installedCyberware) => {
    LOGGER.trace("cprGetMookCyberware | handlebarsHelper | Called.");
    const installedCyberwareList = [];
    Object.entries(installedCyberware).forEach(([k, v]) => {
      if (installedCyberware[k].length > 0) {
        if (k !== "cyberwareInternal" && k !== "cyberwareExternal" && k !== "fashionware") {
          v.forEach((a) => {
            installedCyberwareList.push(a);
          });
        } else if (installedCyberware[k][0].optionals.length > 0) {
          v.forEach((a) => {
            installedCyberwareList.push(a);
          });
        }
      }
    });
    return installedCyberwareList;
  });

  /**
   * Return how many installed cyberware items an actor has
   */
  Handlebars.registerHelper("cprGetMookCyberwareLength", (installedCyberware) => {
    LOGGER.trace("cprGetMookCyberwareLength | handlebarsHelper | Called.");
    const installedCyberwareList = [];
    Object.entries(installedCyberware).forEach(([k, v]) => {
      if (installedCyberware[k].length > 0) {
        if (k !== "cyberwareInternal" && k !== "cyberwareExternal" && k !== "fashionware") {
          v.forEach((a) => {
            installedCyberwareList.push(a);
          });
        } else if (installedCyberware[k][0].optionals.length > 0) {
          v.forEach((a) => {
            installedCyberwareList.push(a);
          });
        }
      }
    });
    return installedCyberwareList.length;
  });

  /**
   * Get details about an entity type that the game system is aware of
   */
  Handlebars.registerHelper("cprEntityTypes", (entityType) => {
    LOGGER.trace("cprEntityTypes | handlebarsHelper | Called.");
    return typeof game.system.documentTypes[entityType] === "object" ? game.system.documentTypes[entityType] : {};
  });

  /**
   * Returns true if an item type can be upgraded. This means it has the upgradable property in the data model.
   */
  Handlebars.registerHelper("cprIsUpgradable", (itemType) => {
    LOGGER.trace("cprIsUpgradable | handlebarsHelper | Called.");
    const itemEntities = game.system.template.Item;
    return itemEntities[itemType].templates.includes("upgradable");
  });

  /**
   * Returns true if an item type has a particular template applied in the data model
   * To Do: isUpgradeable should use this instead
   */
  Handlebars.registerHelper("cprHasTemplate", (itemType, templateName) => {
    LOGGER.trace("cprHasTemplate | handlebarsHelper | Called.");
    const itemEntities = game.system.template.Item;
    return itemEntities[itemType].templates.includes(templateName);
  });

  /**
   * Look at the data model for a type of item, and return the list of templates it comes with
   */
  Handlebars.registerHelper("cprGetTemplates", (itemType) => {
    LOGGER.trace("cprGetTemplates | handlebarsHelper | Called.");
    return SystemUtils.getDataModelTemplates(itemType);
  });

  /**
   * Return the stat-changing details as text if an object has an upgrade
   */
  Handlebars.registerHelper("cprShowUpgrade", (obj, dataPoint) => {
    LOGGER.trace("cprShowUpgrade | handlebarsHelper | Called.");
    const itemEntities = game.system.template.Item;
    const itemType = obj.type;
    let upgradeText = "";
    if (itemEntities[itemType].templates.includes("upgradable") && obj.data.data.isUpgraded) {
      const upgradeValue = obj.getAllUpgradesFor(dataPoint);
      if (upgradeValue !== 0 && upgradeValue !== "") {
        const modType = obj.getUpgradeTypeFor(dataPoint);
        const modSource = (itemType === "weapon") ? SystemUtils.Localize("CPR.itemSheet.weapon.attachments") : SystemUtils.Localize("CPR.itemSheet.common.upgrades");
        upgradeText = `(${SystemUtils.Format("CPR.itemSheet.common.modifierChange", { modSource, modType, value: upgradeValue })})`;
      }
    }
    return upgradeText;
  });

  /**
   * If an upgrade exists that applies changes to a stat or skill, calculate and return the
   * result.
   */
  Handlebars.registerHelper("cprApplyUpgrade", (obj, baseValue, dataPoint) => {
    LOGGER.trace("cprApplyUpgrade | handlebarsHelper | Called.");
    const itemEntities = game.system.template.Item;
    const itemType = obj.type;
    let upgradeResult = Number(baseValue);
    if (Number.isNaN(upgradeResult)) {
      upgradeResult = baseValue;
    }
    if (itemEntities[itemType].templates.includes("upgradable") && obj.data.data.isUpgraded) {
      const upgradeValue = obj.getAllUpgradesFor(dataPoint);
      const upgradeType = obj.getUpgradeTypeFor(dataPoint);
      if (upgradeValue !== "" && upgradeValue !== 0) {
        if (upgradeType === "override") {
          upgradeResult = upgradeValue;
        } else if (typeof upgradeResult !== "number" || typeof upgradeValue !== "number") {
          if (upgradeValue !== 0 && upgradeValue !== "") {
            upgradeResult = `${upgradeResult} + ${upgradeValue}`;
          }
        } else {
          upgradeResult += upgradeValue;
        }
      }
    }
    return upgradeResult;
  });

  /**
   * Return true if a bit of text matches a filter value. If the filter is not set, everything matches.
   */
  Handlebars.registerHelper("cprSheetContentFilter", (filterValue, applyToText) => {
    LOGGER.trace("cprFilter | handlebarsHelper | Called.");
    if (typeof filterValue === "undefined" || filterValue === "" || !game.settings.get("cyberpunk-red-core", "enableSheetContentFilter")) {
      return true;
    }
    return applyToText.toLowerCase().indexOf(filterValue.toLowerCase()) !== -1;
  });

  /**
   * For readability's sake return (a translated) "Yes" or "No" based on whether something is true or false
   */
  Handlebars.registerHelper("cprYesNo", (bool) => {
    LOGGER.trace("cprYesNo | handlebarsHelper | Called.");
    if (bool) return SystemUtils.Localize("CPR.global.generic.yes");
    return SystemUtils.Localize("CPR.global.generic.no");
  });

  /**
   * For readability's sake, translate the "mode" of an active effect mod into an intuitive mathematical operator.
   * For unknown modes, just return a question mark, which shouldn't happen. Modes are constants provided by Foundry:
   *    0 (CUSTOM) - calls the "applyActiveEffect" hook with the value to figure out what to do with it (not used)
   *    1 (MULTIPLY) - multiply this value with the current one
   *    2 (ADD) - add this value to the current value (as an Integer) or set it if currently null
   *    3 (DOWNGRADE) - like OVERRIDE but only replace if the value is lower (worse)
   *    4 (UPGRADE) - like OVERRIDE but only replace if the value is higher (better)
   *    5 (OVERRIDE) - replace the current value with this one
   */
  Handlebars.registerHelper("cprEffectModMode", (mode, value) => {
    LOGGER.trace("cprEffectModMode | handlebarsHelper | Called.");
    switch (mode) {
      case 1:
        return "*";
      case 2:
        return value > 0 ? "+" : ""; // account for minus already being there for negative numbers
      case 3:
        return "<=";
      case 4:
        return ">=";
      case 5:
        return "=";
      default:
        return "?";
    }
  });

  /**
   * Figure out if an effect row should have a toggle glyph displayed or not.
   * Only show the toggle if 1 of these conditions is true:
   *    1. the effect is on the actor itself, not from an item
   *    2. the item usage is set to "toggled"
   *    3. the item is not suppressed and usage is not set to "always"
   *
   * @param {CPRActiveEffect} - effect data object
   * @name {String} - the name of the actor
   * @returns true or false if the toggle glyph should be displayed
   */
  Handlebars.registerHelper("cprShowEffectToggle", (effect, name) => {
    LOGGER.trace("cprShowEffectToggle | handlebarsHelper | Called.");
    if (effect.sourceName === name) return true;
    if (!effect.data.isSuppressed && effect.usage !== "always") return true;
    if (effect.data.isSuppressed && effect.usage === "toggled") return true;
    return false;
  });

  /**
   * Get the transient bonus value applied to skills applied from Active Effects
   */
  Handlebars.registerHelper("cprGetSkillBonus", (skillName, actor) => {
    LOGGER.trace("cprGetSkillBonus | handlebarsHelper | Called.");
    return actor.getSkillMod(skillName);
  });

  /**
   * Return true/false depending on whether debugElements setting in the game is enabled
   */
  Handlebars.registerHelper("cprIsDebug", () => {
    LOGGER.trace("cprIsDebug | handlebarsHelper | Called.");
    return game.settings.get("cyberpunk-red-core", "debugElements");
  });

  /**
   * Emit a debug message to the dev log
   */
  Handlebars.registerHelper("cprDebug", (msg) => {
    LOGGER.debug(msg);
  });

  /**
   * Emit a trace message to the dev log
   */
  Handlebars.registerHelper("cprTrace", (msg) => {
    LOGGER.trace(msg);
  });
}
