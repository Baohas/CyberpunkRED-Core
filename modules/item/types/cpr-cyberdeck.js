/* global duplicate game randomID Actor Scene canvas */

import CPR from "../../system/config.js";
import CPRItem from "../cpr-item.js";
import * as CPRRolls from "../../rolls/cpr-rolls.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * Extend the base CPRItem object with things specific to cyberdecks.
 * @extends {CPRItem}
 */
export default class CPRCyberdeckItem extends CPRItem {
  /**
   * Cyberdeck Code
   *
   * The methods below apply to the CPRItem.type = "cyberdeck"
  */

  /**
   * Dynamically calculates the number of free slots on the Cyberdeck
   * by starting with the number of slots this cyberdeck has and substacting
   * the slot size of each of the installed programs.
   *
   * @override
   * @public
   */
  availableSlots() {
    LOGGER.trace("availableSlots | CPRCyberdeckItem | Called.");
    const itemData = duplicate(this.data.data);
    let unusedSlots = 0;
    const upgradeValue = this.getAllUpgradesFor("slots");
    const upgradeType = this.getUpgradeTypeFor("slots");
    unusedSlots = (upgradeType === "override") ? upgradeValue : itemData.slots + upgradeValue;
    itemData.programs.installed.forEach((program) => {
      unusedSlots -= program.data.slots;
    });
    itemData.upgrades.forEach((u) => {
      unusedSlots -= u.data.size;
    });
    return unusedSlots;
  }

  /**
   * Returns a list of installed programs.  This is a list of ItemData as the
   * Item itself is not stored because Items can't own Items. As such, if you
   * are looking for a specific program, each Array entry has a entry._id of
   * the Object it represents.
   *
   * @public
   */
  getInstalledPrograms() {
    LOGGER.trace("getInstalledPrograms | CPRCyberdeckItem | Called.");
    return this.data.data.programs.installed;
  }

  /**
   * Returns a list of rezzed programs.  This is a list of ItemData as the
   * Item itself is not stored because Items can't own Items. As such, if you
   * are looking for a specific program, each Array entry has a entry._id of
   * the Object it represents.
   *
   * @public
   */
  getRezzedPrograms() {
    LOGGER.trace("getRezzedPrograms | CPRCyberdeckItem | Called.");
    return this.data.data.programs.rezzed;
  }

  /**
   * Install programs from the Cyberdeck
   *
   * @public
   * @param {Array} programs      - Array of CPRItem programs
   */
  installPrograms(programs) {
    LOGGER.trace("installPrograms | CPRCyberdeckItem | Called.");
    const { installed } = this.data.data.programs;
    programs.forEach((p) => {
      const onDeck = installed.filter((iProgram) => iProgram._id === p.data._id);
      if (onDeck.length === 0) {
        const programInstallation = p.data;
        programInstallation.data.isRezzed = false;
        installed.push(programInstallation);
        p.setInstalled();
      }
    });
    this.data.data.programs.installed = installed;
  }

  /**
   * Uninstall programs from the Cyberdeck
   *
   * @public
   * @param {Array} programs      - Array of CPRItem programs
   */
  uninstallPrograms(programs) {
    LOGGER.trace("uninstallPrograms | CPRCyberdeckItem | Called.");
    let { rezzed } = this.data.data.programs;
    let { installed } = this.data.data.programs;
    const tokenList = [];
    let sceneId;
    programs.forEach(async (program) => {
      if (program.data.data.class === "blackice" && this.isRezzed(program)) {
        const rezzedIndex = this.data.data.programs.rezzed.findIndex((p) => p._id === program.id);
        const programData = this.data.data.programs.rezzed[rezzedIndex];
        const cprFlags = programData.flags["cyberpunk-red-core"];
        if (cprFlags.biTokenId) {
          tokenList.push(cprFlags.biTokenId);
        }
        if (cprFlags.sceneId) {
          sceneId = cprFlags.sceneId;
        }
      }
      installed = installed.filter((p) => p._id !== program.id);
      rezzed = rezzed.filter((p) => p._id !== program.id);
      if ((typeof program.unsetInstalled === "function")) {
        program.unsetInstalled();
      }
    });
    this.data.data.programs.installed = installed;
    this.data.data.programs.rezzed = rezzed;

    if (tokenList.length > 0 && sceneId) {
      const sceneList = game.scenes.filter((s) => s.id === sceneId);
      if (sceneList.length === 1) {
        const [scene] = sceneList;
        return scene.deleteEmbeddedDocuments("Token", tokenList);
      }
    }
    return null;
  }

  /**
   * Return true/false if the program is Rezzed
   *
   * @public
   * @param {CPRItem} program      - CPRItem of the program to check
   */
  isRezzed(program) {
    LOGGER.trace("isRezzed | CPRCyberdeckItem | Called.");
    const rezzedPrograms = this.data.data.programs.rezzed.filter((p) => p._id === program.id);
    const { installed } = this.data.data.programs;
    const installIndex = installed.findIndex((p) => p._id === program.data._id);
    const programState = installed[installIndex];
    programState.data.isRezzed = (rezzedPrograms.length > 0);
    installed[installIndex] = programState;
    this.data.data.programs.installed = installed;
    // Passed by reference
    // eslint-disable-next-line no-param-reassign
    program.data.isRezzed = (rezzedPrograms.length > 0);
    return (rezzedPrograms.length > 0);
  }

  /**
   * Rez a program by setting the isRezzed boolean on the program to true
   * and push the program onto the rezzed array of the Cyberdeck
   *
   * @public
   * @param {CPRItem} program      - CPRItem of the program to REZ
   */
  async rezProgram(program, callingToken) {
    LOGGER.trace("rezProgram | CPRCyberdeckItem | Called.");
    const programData = duplicate(program.data);
    const { installed } = this.data.data.programs;
    const installIndex = installed.findIndex((p) => p._id === programData._id);
    const programState = installed[installIndex];
    // This instance ID is being added pro-actively because the rulebook
    // is a bit fuzzy on the bottom of Page 201 with regards to rezzing the
    // same program multiple times.  The rulebook says:
    // "You can run multiple copies of the same Program on your Cyberdeck"
    // however when I asked on the Discord, I was told you can not do this,
    // you have to install a program twice on the Cyberdeck if you want to
    // rez it twice.  So the code here supports what was told to me in Discord.
    // If it ever comes back that a single install of a program can be run
    // multiple times, we will already have a an instance ID to differentiate
    // the different rezzes.
    const rezzedInstance = randomID();
    program.setFlag("cyberpunk-red-core", "rezInstanceId", rezzedInstance);
    program.setRezzed();
    programState.data.isRezzed = true;
    installed[installIndex] = programState;
    if (programData.data.class === "blackice") {
      await this._rezBlackIceToken(programData, callingToken);
    }
    this.data.data.programs.installed = installed;
    this.data.data.programs.rezzed.push(programData);
  }

  _createCyberdeckRoll(rollType, actor, extraData = {}) {
    LOGGER.trace("_createCyberdeckRoll | CPRCyberdeckItem | Called.");
    let cprRoll;
    const { programId } = extraData;
    const programList = this.getInstalledPrograms().filter((iProgram) => iProgram._id === programId);
    let program = (programList.length > 0) ? programList[0] : null;
    let damageFormula = (program === null) ? "1d6" : program.data.damage.standard;
    if (program.data.class === "blackice") {
      const rezzedList = this.getRezzedPrograms().filter((rProgram) => rProgram._id === programId);
      program = (rezzedList.length > 0) ? rezzedList[0] : null;
      if (program.data.blackIceType === "antiprogram") {
        damageFormula = program.data.damage.blackIce;
      }
    }
    if (program === null) {
      LOGGER.error(`_createCyberdeckRoll | CPRCyberdeckItem | Unable to locate program ${programId}.`);
      return CPRRolls.CPRRoll("Unknown Program", "1d10");
    }
    const skillName = "";
    const skillValue = 0;
    const roleName = (program.data.class === "blackice") ? "Black ICE" : extraData.netRoleItem.data.data.mainRoleAbility;
    const roleValue = (program.data.class === "blackice") ? 0 : extraData.netRoleItem.data.data.rank;
    const atkValue = (program === null) ? 0 : program.data.atk;
    const pgmName = (program === null) ? "Program" : program.name;
    const { executionType } = extraData;
    switch (executionType) {
      case "atk":
      case "def": {
        const niceName = executionType.toUpperCase();
        cprRoll = (program.data.class === "blackice") ? new CPRRolls.CPRStatRoll(niceName, program.data[executionType]) : new CPRRolls.CPRAttackRoll(
          pgmName,
          niceName,
          atkValue,
          skillName,
          skillValue,
          roleName,
          roleValue,
          "program",
        );
        cprRoll.rollCardExtraArgs.program = program;
        break;
      }
      case "damage": {
        cprRoll = new CPRRolls.CPRDamageRoll(program.name, damageFormula, "program");
        cprRoll.rollCardExtraArgs.pgmClass = program.data.class;
        cprRoll.rollCardExtraArgs.pgmDamage = program.data.damage;
        cprRoll.rollCardExtraArgs.program = program;
        break;
      }
      default:
    }
    cprRoll.setNetCombat(pgmName);
    if (roleName !== "blackice") cprRoll.addMod(this.actor.data.bonuses[SystemUtils.slugify(roleName)]);
    cprRoll.addMod(actor.getWoundStateMods());
    return cprRoll;
  }

  /**
   * Create a roll object appropriate for rolling an ability associated with Interfaces
   *
   * @param {CPRCharacterActor} actor - the actor associated with this role item
   * @param {Object} rollInfo - magic object with more role configuration data
   * @returns {CPRRoll}
   */
  _createInterfaceRoll(rollInfo) {
    LOGGER.trace("_createInterfaceRoll | CPRCyberdeckItem | Called.");
    let rollTitle;
    const roleName = rollInfo.netRoleItem.data.data.mainRoleAbility;
    const roleValue = rollInfo.netRoleItem.data.data.rank;
    const { interfaceAbility } = rollInfo;
    switch (interfaceAbility) {
      case "speed": {
        rollTitle = SystemUtils.Localize("CPR.global.generic.speed");
        break;
      }
      case "defense": {
        rollTitle = SystemUtils.Localize("CPR.global.generic.defense");
        break;
      }
      default: {
        rollTitle = SystemUtils.Localize(CPR.interfaceAbilities[interfaceAbility]);
      }
    }
    const cprRoll = new CPRRolls.CPRRoleRoll(roleName, roleValue, "--", 0, "--", 0, null);
    cprRoll.setNetCombat(rollTitle);
    // consider active effects
    if (interfaceAbility === "perception") {
      // hack because "perception" is already used for the skill
      cprRoll.addMod(this.actor.data.bonuses.perception_net);
    } else {
      cprRoll.addMod(this.actor.data.bonuses[interfaceAbility]);
    }
    cprRoll.addMod(this.actor.data.bonuses[SystemUtils.slugify(roleName)]);
    cprRoll.addMod(this.actor.getWoundStateMods());
    return cprRoll;
  }

  /**
   * Create a Black ICE Token on the active scene as it was just rezzed
   *
   * @private
   * @param {CPRItem} program      - CPRItem of the program create the Token for
   */
  async _rezBlackIceToken(programData, callingToken) {
    LOGGER.trace("_rezBlackIceToken | CPRCyberdeckItem | Called.");
    let netrunnerToken = callingToken;
    let scene;
    const blackIceName = programData.name;

    if (!netrunnerToken && this.actor.isToken) {
      netrunnerToken = this.actor.token;
    }

    if (!netrunnerToken) {
      // Search for a token associated with this Actor ID.
      const tokenList = game.scenes.map((tokenDoc) => tokenDoc.tokens.filter((t) => t.id === this.actor.id)).filter((s) => s.length > 0);
      if (tokenList.length === 1) {
        [netrunnerToken] = tokenList;
      } else {
        LOGGER.error(`Attempting to create a Black ICE Token failed because we were unable to find a Token associated with World Actor "${this.actor.name}".`);
        SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.messages.rezBlackIceWithoutToken"));
        return;
      }
    }

    if (netrunnerToken.isEmbedded && netrunnerToken.parent instanceof Scene) {
      scene = netrunnerToken.parent;
    } else {
      LOGGER.error(`_rezBlackIceToken | CPRItem | Attempting to create a Black ICE Token failed because the token does not appear to be part of a scene.`);
      SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.rezbiwithoutscene"));
      return;
    }

    // First, let's see if an Actor exists that is a blackIce Actor with the same name, if so, we will use that
    // to model the token Actor Data.
    const blackIceActors = game.actors.filter((bi) => bi.type === "blackIce" && bi.name === blackIceName);
    let blackIce;
    if (blackIceActors.length === 0) {
      try {
        // We didn't find a blackIce Actor with a matching name so we need to create one dynamically.
        // We will keep all auto-generated Actors in a Folder called CPR Autogenerated to ensure the Actors
        // list of the user stays clean.
        const dynamicFolderName = "CPR Autogenerated";
        const dynamicFolder = await SystemUtils.GetFolder("Actor", dynamicFolderName);
        // Create a new Black ICE Actor
        blackIce = await Actor.create({
          name: blackIceName,
          type: "blackIce",
          folder: dynamicFolder,
          img: "systems/cyberpunk-red-core/icons/netrunning/Black_Ice.png",
        });
        // Configure the Actor based on the Black ICE Program Stats.
        blackIce.programmaticallyUpdate(
          programData.data.blackIceType, programData.data.per,
          programData.data.spd, programData.data.atk,
          programData.data.def, programData.data.rez,
          programData.data.rez, programData.data.description.value,
        );
      } catch (error) {
        LOGGER.error(`_rezBlackIceToken | CPRItem | Attempting to create a Black ICE Actor failed. Error: ${error}`);
        return;
      }
    } else {
      // We found a matching Actor so we will use that to model our Token Data
      [blackIce] = blackIceActors;
    }

    const tokenFlags = {
      netrunnerTokenId: netrunnerToken.id,
      sourceCyberdeckId: this.id,
      programId: programData._id,
      sceneId: scene.id,
    };
    const tokenData = [{
      name: blackIce.name,
      actorId: blackIce.data._id,
      actorData: blackIce.data,
      actorLink: false,
      img: blackIce.img,
      x: netrunnerToken.data.x + 75,
      y: netrunnerToken.data.y,
      flags: { "cyberpunk-red-core": tokenFlags },
    }];
    try {
      const biTokenList = await scene.createEmbeddedDocuments("Token", tokenData);
      const biToken = (biTokenList.length > 0) ? biTokenList[0] : null;
      if (biToken !== null) {
        // Update the Token Actor based on the Black ICE Program Stats, leaving any effect description in place.
        biToken.actor.programmaticallyUpdate(
          programData.data.blackIceType, programData.data.per,
          programData.data.spd, programData.data.atk,
          programData.data.def, programData.data.rez,
          programData.data.rez,
        );
        const cprFlags = (typeof programData.flags["cyberpunk-red-core"] !== "undefined") ? programData.flags["cyberpunk-red-core"] : {};
        cprFlags.biTokenId = biToken.id;
        cprFlags.sceneId = scene.id;
        // Passed by reference
        // eslint-disable-next-line no-param-reassign
        programData.flags["cyberpunk-red-core"] = cprFlags;
      }
    } catch (error) {
      LOGGER.error(`_rezBlackIceToken | CPRItem | Attempting to create a Black ICE Token failed. Error: ${error}`);
    }
  }

  /**
   * Remove a program from the rezzed list on the Cyberdeck
   *
   * @public
   * @param {CPRItem} program      - CPRItem of the program de-rez
   */
  async derezProgram(program) {
    LOGGER.trace("derezProgram | CPRCyberdeckItem | Called.");
    const { installed } = this.data.data.programs;
    const installIndex = installed.findIndex((p) => p._id === program.id);
    const programState = installed[installIndex];
    const { rezzed } = this.data.data.programs;
    const rezzedIndex = rezzed.findIndex((p) => p._id === program.id);
    const programData = rezzed[rezzedIndex];
    programState.data.isRezzed = false;
    program.unsetRezzed();
    installed[installIndex] = programState;
    if (program.data.data.class === "blackice") {
      await CPRCyberdeckItem._derezBlackIceToken(programData);
    }
    const newRezzed = this.data.data.programs.rezzed.filter((p) => p._id !== program.id);
    this.data.data.programs.rezzed = newRezzed;
  }

  /**
   * Remove a Black ICE Token from the game as it is de-rezzed
   *
   * @private
   * @param {CPRItem} program      - CPRItem of the program to remove the token for
   */
  static async _derezBlackIceToken(programData) {
    LOGGER.trace("_derezBlackIceToken | CPRCyberdeckItem | Called.");
    if (typeof programData.flags["cyberpunk-red-core"] !== "undefined") {
      const cprFlags = programData.flags["cyberpunk-red-core"];
      const { biTokenId } = cprFlags;
      const { sceneId } = cprFlags;
      if (typeof biTokenId !== "undefined" && typeof sceneId !== "undefined") {
        const sceneList = game.scenes.filter((s) => s.id === sceneId);
        if (sceneList.length === 1) {
          const [scene] = sceneList;
          const tokenList = scene.tokens.filter((t) => t.id === biTokenId);
          if (tokenList.length === 1) {
            await scene.deleteEmbeddedDocuments("Token", [biTokenId]);
          } else {
            LOGGER.warn(`_derezBlackIceToken | CPRItem | Unable to find biTokenId (${biTokenId}) in scene ${Scene.name} (${Scene.id}). May have been already deleted.`);
          }
        } else {
          LOGGER.error(`_derezBlackIceToken | CPRItem | Unable to locate sceneId ${Scene.id}`);
        }
      } else {
        LOGGER.error(`_derezBlackIceToken | CPRItem | Unable to retrieve biTokenId and sceneId from programData: ${programData.name} (${programData._id})`);
      }
    } else {
      LOGGER.error(`_derezBlackIceToken | CPRItem | No flags found in programData.`);
    }
  }

  /**
   * Reset a rezzed program numbers to be that of the installed version of the program
   *
   * @public
   * @param {CPRItem} program      - CPRItem of the program to reset
   */
  resetRezProgram(program) {
    LOGGER.trace("resetRezProgram | CPRCyberdeckItem | Called.");
    const { rezzed } = this.data.data.programs;
    const rezzedIndex = rezzed.findIndex((p) => p._id === program.id);
    const { installed } = this.data.data.programs;
    const installedIndex = installed.findIndex((p) => p._id === program.id);
    this.data.data.programs.rezzed[rezzedIndex] = this.data.data.programs.installed[installedIndex];
  }

  /**
   * Reduce the rezzed value of a rezzed program.
   *
   * @public
   * @param {CPRItem} program     - The program to reduce the REZ of
   * @param {Number} reduceAmount - Amount to reduce REZ by. Defaults to 1.
   */
  reduceRezProgram(program, reduceAmount = 1) {
    LOGGER.trace("reduceRezProgram | CPRCyberdeckItem | Called.");
    const { rezzed } = this.data.data.programs;
    const rezzedIndex = rezzed.findIndex((p) => p._id === program.id);
    const programState = rezzed[rezzedIndex];
    const newRez = Math.max(programState.data.rez - reduceAmount, 0);
    programState.data.rez = newRez;
    this.data.data.programs.rezzed[rezzedIndex] = programState;
    if (programState.data.class === "blackice" && typeof programState.flags["cyberpunk-red-core"] !== "undefined") {
      const cprFlags = programState.flags["cyberpunk-red-core"];
      if (typeof cprFlags.biTokenId !== "undefined") {
        const { biTokenId } = cprFlags;
        const tokenList = canvas.scene.tokens.map((tokenDoc) => tokenDoc.actor.token).filter((token) => token).filter((t) => t.id === biTokenId);
        if (tokenList.length === 1) {
          const [biToken] = tokenList;
          biToken.actor.programmaticallyUpdate(
            programState.data.blackIceType, programState.data.per,
            programState.data.spd, programState.data.atk,
            programState.data.def, programState.data.rez,
          );
        }
      }
    }
  }

  /**
   * Update a rezzed program with updated data
   *
   * @param {String} programId - the _id of the program to be updated
   * @param {Object} updatedData - object data of the program to update with
   */
  updateRezzedProgram(programId, updatedData) {
    LOGGER.trace("updateRezzedProgram | CPRCyberdeckItem | Called.");
    const { rezzed } = this.data.data.programs;
    const rezzedIndex = rezzed.findIndex((p) => p._id === programId);
    const programState = rezzed[rezzedIndex];
    const dataPoints = Object.keys(updatedData);
    dataPoints.forEach((attribute) => {
      switch (attribute) {
        case "per":
        case "spd":
        case "atk":
        case "def": {
          programState.data[attribute] = updatedData[attribute];
          break;
        }
        case "rez": {
          programState.data.rez = updatedData.rez.value;
          break;
        }
        default:
      }
    });
  }
}
