/* global game ui Folder */
/* eslint-env jquery */

import LOGGER from "./cpr-logger.js";

/**
 * CPR-C utilities that are meant to have broad application across the whole system module.
 */
export default class CPRSystemUtils {
  /**
   * Return an array of "core" skills that are defined in the rules, and all characters
   * start with them defined.
   *
   * @returns {Documents}
   */
  static async GetCoreSkills() {
    LOGGER.trace("GetCoreSkills | CPRSystemUtils | Called.");
    // grab basic skills from compendium
    const pack = game.packs.get("cyberpunk-red-core.skills");
    // put into basickSills array
    const content = await pack.getDocuments();
    return content;
  }

  /**
   * Return an array of "core" cyberware that is installed in all characters. These objects
   * are how cyberware with no corresponding foundation to install it in. (chipware for example)
   *
   * @returns {Documents}
   */
  static async GetCoreCyberware() {
    LOGGER.trace("GetCoreCyberware | CPRSystemUtils | Called.");
    // grab basic cyberware from compendium
    const pack = game.packs.get("cyberpunk-red-core.cyberware");
    // put into basicCyberware array
    const content = await pack.getDocuments();
    return content;
  }

  /**
   * Get rollable tables by name, optionally by searching with a regexp
   *
   * @param {String} tableName
   * @param {RegExp} useRegExp
   * @returns {Array} table objects matching the given criteria
   */
  static GetRollTables(tableName, useRegExp) {
    LOGGER.trace("GetRollTables | CPRSystemUtils | Called.");
    let tableList;
    if (useRegExp) {
      const searchString = new RegExp(tableName);
      tableList = game.tables.filter((t) => t.name.match(searchString));
    } else {
      tableList = game.tables.filter((t) => t.name === tableName);
    }
    return tableList;
  }

  /**
   * Display user-visible message. (blue, yellow, or red background)
   *
   * @param {String} msgType - type of message to display, which controls the color fo the dialog
   * @param {String} msg - the message to print (untranslated)
   */
  static async DisplayMessage(msgType, msg) {
    LOGGER.trace("DisplayMessage | CPRSystemUtils | Called.");
    const localizedMessage = CPRSystemUtils.Localize(msg);
    switch (msgType) {
      case "warn":
        ui.notifications.warn(localizedMessage);
        LOGGER.warn(localizedMessage);
        break;
      case "error":
        ui.notifications.error(localizedMessage);
        LOGGER.error(localizedMessage);
        break;
      case "notify":
        ui.notifications.notify(localizedMessage);
        LOGGER.log(localizedMessage);
        break;
      default:
    }
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  static Localize(string) {
    return game.i18n.localize(string);
  }

  // eslint-disable-next-line foundry-cpr/logger-after-function-definition
  static Format(string, object) {
    return game.i18n.format(string, object);
  }

  /**
   * For settings like favorite items or skills, and opening or closing categories, we save the user's
   * preferences in a hidden system setting.
   *
   * To Do: Flags may be a better implementation.
   *
   * @param {String} type - indicate whether this is a sheetConfig setting or something else
   * @param {String} name - name for the setting
   * @param {*} value - the value for the setting to save
   * @param {*} extraSettings - a prefix for the name of the setting (sheetConfig only)
   */
  static SetUserSetting(type, name, value, extraSettings) {
    LOGGER.trace("SetUserSetting | CPRSystemUtils | Called.");
    const userSettings = game.settings.get("cyberpunk-red-core", "userSettings") ? game.settings.get("cyberpunk-red-core", "userSettings") : {};
    switch (type) {
      case "sheetConfig": {
        // If this is a sheetConfig setting, our user may have settings for different sheets, so
        // to account for this, we pass the id of the sheet that this setting is
        // for in extraSettings.  We store the value as the id-settingName in userSettings.sheetConfig
        const settingKey = `${extraSettings}-${name}`;
        // Get all of the sheet config data stored for this user
        let sheetConfigData = userSettings.sheetConfig;
        // See if we have any sheetConfig data
        if (sheetConfigData === undefined) {
          // If not, we set sheetConfigData to an empty object;
          sheetConfigData = {};
        }
        // We set the value of the sheet data for our key
        sheetConfigData[settingKey] = value;

        // Update the sheetConfig setting in our userSettings
        userSettings.sheetConfig = sheetConfigData;
        break;
      }
      default: {
        // By default, we store a simple name value/key pair
        userSettings[name] = value;
      }
    }
    // Update the userSettings object
    game.settings.set("cyberpunk-red-core", "userSettings", userSettings);
  }

  /**
   * Get a hidden user setting. (see SetUserSetting above)
   *
   * @param {String} type - indicate whether this is a sheetConfig setting or something else
   * @param {String} name - name for the setting
   * @param {*} extraSettings - a prefix for the name of the setting (sheetConfig only)
   * @returns - the request hidden setting value
   */
  static GetUserSetting(type, name, extraSettings) {
    LOGGER.trace("GetUserSetting | CPRSystemUtils | Called.");
    const userSettings = game.settings.get("cyberpunk-red-core", "userSettings") ? game.settings.get("cyberpunk-red-core", "userSettings") : {};
    let requestedValue;
    switch (type) {
      case "sheetConfig": {
        const settingKey = `${extraSettings}-${name}`;
        const sheetConfigData = userSettings.sheetConfig;
        if (sheetConfigData !== undefined) {
          requestedValue = sheetConfigData[settingKey];
        }
        break;
      }
      default: {
        requestedValue = userSettings[name];
      }
    }
    return requestedValue;
  }

  /**
   * When a new object (document) is created in our module, we want to provide a cool looking
   * default icon. This method retrieves paths to icons based on the object type.
   *
   * @param {String} foundryObject - the object (document) type (Actor, Item, etc)
   * @param {*} objectType - the subtype of object to get an icon for (e.g. ammo or armor for an Item)
   * @returns {String} - path to an icon to use
   */
  static GetDefaultImage(foundryObject, objectType) {
    LOGGER.trace("GetDefaultImage | CPRSystemUtils | Called.");
    let imageLink = "";
    if (foundryObject === "Item") {
      switch (objectType) {
        case "ammo": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Ammo.svg";
          break;
        }
        case "armor": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Armor.svg";
          break;
        }
        case "clothing": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Clothing.svg";
          break;
        }
        case "criticalInjury": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Critical_Injury.svg";
          break;
        }
        case "cyberdeck": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Cyberdeck.svg";
          break;
        }
        case "cyberware": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Cyberware.svg";
          break;
        }
        case "gear": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Gear.svg";
          break;
        }
        case "netarch": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Net_Architecture.svg";
          break;
        }
        case "program": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Program.svg";
          break;
        }
        case "role": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Role.svg";
          break;
        }
        case "skill": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Skill.svg";
          break;
        }
        case "vehicle": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Vehicle.svg";
          break;
        }
        case "weapon": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/weapons/heavyPistol.svg";
          break;
        }
        default: {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Gear.svg";
          break;
        }
      }
    } else if (foundryObject === "Actor") {
      switch (objectType) {
        case "blackIce": {
          imageLink = "systems/cyberpunk-red-core/icons/netrunning/Black_Ice.png";
          break;
        }
        case "container": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Container.svg";
          break;
        }
        case "demon": {
          imageLink = "systems/cyberpunk-red-core/icons/netrunning/Demon.png";
          break;
        }
        case "mook": {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_Mook.svg";
          break;
        }
        default: {
          imageLink = "systems/cyberpunk-red-core/icons/compendium/default/Default_CPR_Mystery_Man.svg";
        }
      }
    }
    return imageLink;
  }

  /**
   * Some actions users can take in this system will produce a bunch of documents are entities, and
   * we group them up in a dynamically created folder. This is where that magic happens.
   *
   * @param {String} type - the entity type the folder should group together
   * @param {String} name - a name for the folder
   * @param {String} parent - (optional) folder ID to create this in, or null for a top-level folder
   * @returns {Folder} - the referenced folder or a newly created one
   */
  static async GetFolder(type, name, parent = null) {
    LOGGER.trace("GetFolder | CPRSystemUtils | Called.");
    const folderList = game.folders.filter((folder) => folder.name === name && folder.type === type);
    // If the folder does not exist, we create it.
    return (folderList.length === 1) ? folderList[0] : Folder.create({ name, type, parent });
  }

  /**
   * Given a data model template name, return the array of item types it is applied to
   *
   * @param {String} templateName - the template name to look up
   * @returns {Array}
   */
  static GetTemplateItemTypes(templateName) {
    LOGGER.trace("GetTemplateItemTypes | CPRSystemUtils | Called.");
    const itemTypes = [];
    const itemEntityTypes = game.system.template.Item.types;
    itemEntityTypes.forEach((entityType) => {
      const entity = game.system.template.Item[entityType];
      if (entity.templates.includes(templateName)) {
        itemTypes.push(entityType);
      }
    });
    return itemTypes;
  }

  /**
   * Inspect an event object for passed-in field specific to the target (link) that was clicked.
   * This code will initially look at the current target, and if the field is not found, it will
   * climb up the parents of the target until one is found, or print an error and return undefined.
   *
   * @param {Object} event - event data from jquery
   * @param {String} datum - the field we are interested in getting
   * @returns {String} - the value of the field passed in the event data
   */
  static GetEventDatum(event, datum) {
    LOGGER.trace("GetEventDatum | CPRSystemUtils | Called.");
    let id = $(event.currentTarget).attr(datum);
    if (typeof id === "undefined") {
      LOGGER.debug(`Could not find ${datum} in currentTarget trying .item parents`);
      id = $(event.currentTarget).parents(".item").attr(datum);
      if (typeof id === "undefined") {
        LOGGER.warn(`Could not find ${datum} in the event data!`);
      }
    }
    return id;
  }

  /**
   * We use temporary objects with keys derived from skill names elsewhere in the code base.
   * We need to be able to programmatically produce those keys from the name, and that is
   * what this method does. It takes a string and converts it to camelcase.
   *
   * These are used as parts of translation string identifies too. Examples:
   *  "CPR.global.skills.languageStreetslang"               "CPR.global.skills.athleticsAndContortionist"
   *  "CPR.global.skills.basicTechAndWeaponstech"           "CPR.global.skills.compositionAndEducation"
   *  "CPR.global.skills.enduranceAndResistTortureAndDrugs" "CPR.global.skills.persuasionAndTrading"
   *  "CPR.global.skills.evasionAndDance"                   "CPR.global.skills.pickLockAndPickPocket"
   *  "CPR.global.skills.firstAidAndParamedicAndSurgery"
   *
   * NOTE: The strings above are used for Elfines characters, and not used in the code base anywhere. We
   *       have CI that checks all translation strings are used, so to avoid making that fail, please
   *       keep the examples here.
   *
   * TODO: not sure returning something based on the name will work with localization
   *
   * @returns {String}
   */
  static slugify(name) {
    LOGGER.trace("slugify | CPRSkillItem | Called.");
    const slug = name;
    const initialSplit = slug.split(" ").join("");
    const orCaseSplit = initialSplit.split("/").join("Or");
    const parenCaseSplit = initialSplit.split("(").join("").split(")").join("");
    const andCaseSplit = initialSplit.split("/").join("And").split("&").join("And");
    if (slug === "Conceal/Reveal Object" || slug === "Paint/Draw/Sculpt" || slug === "Resist Torture/Drugs") {
      return orCaseSplit.charAt(0).toLowerCase() + orCaseSplit.slice(1);
    }
    if (slug === "Language (Streetslang)") {
      return parenCaseSplit.charAt(0).toLowerCase() + parenCaseSplit.slice(1);
    }
    return andCaseSplit.charAt(0).toLowerCase() + andCaseSplit.slice(1);
  }

  /**
   * Return an array of data model templates associated with this Item's type. "common" is intentionally
   * omitted because nothing should operate on it. The logic for common Item functionality should be in
   * this very file.
   *
   * @returns {Array} - array of template names which just happens to match mixins available
   */
  static getDataModelTemplates(itemType) {
    LOGGER.trace("getDataModelTemplates | CPRSystemUtils | Called.");
    return game.system.template.Item[itemType].templates.filter((t) => t !== "common");
  }

  /**
   * Answer whether an item has a specific data model template applied or not
   */
  static hasDataModelTemplate(itemType, template) {
    LOGGER.trace("hasDataModelTemplate | CPRSystemUtils | Called.");
    return CPRSystemUtils.getDataModelTemplates(itemType).includes(template);
  }

  /**
   * Return the list of actions that can be taken with this item. Used by the actor sheet.
   * Note that "pin" is left out, it is hardcoded in the sheet code.
   * This is not used anywhere right now, but will be useful when associating actions with mixins.
   *
   * V10 WARNING - I do not know the intent of this, but with V10, the item data model changed which would
   *               break the original code.  This has been updated but when used, you need to pass item, not item.data
   *
   * @param {ItemData} item - the item we will be inspecting
   * @returns {String[]} - array of actions that can be taken
   */
  static getActions(item) {
    LOGGER.trace("getActions | CPRItem | Called.");
    const mixins = CPRSystemUtils.getDataModelTemplates(item.type);
    const actions = ["delete"];
    for (let m = 0; m < mixins.length; m += 1) {
      switch (mixins[m]) {
        case "drug": {
          if (item.system.amount > 0) actions.push("snort");
          break;
        }
        case "equippable": {
          actions.push("equip");
          break;
        }
        case "installable": {
          if (!item.system.isInstalled) actions.push("install");
          else actions.push("uninstall");
          break;
        }
        case "loadable": {
          actions.push("reload");
          actions.push("changeAmmo");
          break;
        }
        case "physical": {
          if (item.system.concealable.concealable) actions.push("conceal");
          break;
        }
        case "spawner": {
          actions.push("rez");
          break;
        }
        case "stackable": {
          if (item.system.amount > 1) actions.push("split");
          break;
        }
        default:
      }
    }
    return actions;
  }

  /**
   * Updates the migration bar at the top of the page.
   * The last time this is called should set the percentage to 100 so it will clear the bar.
   *
   * @param {Number} percent - Percentage complete
   * @param {String} migrationStatus - The words to display on the migration status bar
   */
  static updateMigrationBar(percent, updateStatus) {
    LOGGER.trace("updateMigrationBar | CPRSystemUtils");
    const migrating = document.getElementById("cpr-migrating");
    if (migrating === null) {
      // Add the migration bar to the document since it is not there
      const migrationNode = document.createElement("div");
      migrationNode.id = "cpr-migrating";
      migrationNode.style = `display: block;`;
      const migrationBar = document.createElement("div");
      migrationBar.id = "cpr-migration-bar";
      migrationBar.style = `width: ${percent}%`;
      migrationBar.className = "migration-bar";
      const migrationContext = document.createElement("label");
      migrationContext.id = "cpr-mig-context";
      migrationContext.innerHTML = "Migration Test";
      const migrationProgress = document.createElement("label");
      migrationProgress.id = "cpr-mig-progress";
      migrationProgress.innerHTML = `${percent}%`;
      migrationBar.appendChild(migrationContext);
      migrationBar.appendChild(migrationProgress);
      migrationNode.appendChild(migrationBar);
      const uiTop = document.getElementById("ui-top");
      uiTop.appendChild(migrationNode);
    } else {
      // Update the existing bar
      migrating.querySelector("#cpr-mig-context").textContent = updateStatus;
      migrating.querySelector("#cpr-mig-progress").textContent = `${percent}%`;
      migrating.children["cpr-migration-bar"].style = `width: ${percent}%`;
      migrating.style.display = "block";
    }

    if ((percent === 100) && !migrating.hidden) $(migrating).fadeOut(2000);
  }

  /**
   * Fades the migrating bar at the top of the page in the event it gets stuck there. (ie failed migration)
   */
  static fadeMigrationBar() {
    LOGGER.trace("fadeMigrationBar | CPRSystemUtils");
    const migrating = document.getElementById("cpr-migrating");
    if (migrating !== null) {
      if (!migrating.hidden) {
        $(migrating).fadeOut(2000);
      }
    }
  }
}
