/* global ItemSheet */
/* global mergeObject, game, $, hasProperty, getProperty, setProperty, duplicate, fromUuidSync */
import LOGGER from "../../utils/cpr-logger.js";
import CPR from "../../system/config.js";
import { CPRRoll } from "../../rolls/cpr-rolls.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import SelectCompatibleAmmo from "../../dialog/cpr-select-compatible-ammo.js";
import NetarchLevelPrompt from "../../dialog/cpr-netarch-level-prompt.js";
import NetarchRolltableGenerationPrompt from "../../dialog/cpr-netarch-rolltable-generation-prompt.js";
import RoleAbilityPrompt from "../../dialog/cpr-role-ability-prompt.js";
import SelectRoleBonuses from "../../dialog/cpr-select-role-bonuses-prompt.js";
import SelectInstallItemsPrompt from "../../dialog/cpr-select-install-items-prompt.js";
import ConfirmPrompt from "../../dialog/cpr-confirmation-prompt.js";
import DvUtils from "../../utils/cpr-dvUtils.js";
import createImageContextMenu from "../../utils/cpr-imageContextMenu.js";
import ManageInstallableTypes from "../../dialog/cpr-manage-installable-types.js";

/**
 * Extend the basic ActorSheet.
 * @extends {ItemSheet}
 */

export default class CPRItemSheet extends ItemSheet {
  /* -------------------------------------------- */
  /** @override */
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | CPRItemSheet | Called.");
    return mergeObject(super.defaultOptions, {
      tabs: [{ navSelector: ".navtabs-item", contentSelector: ".item-bottom-content-section", initial: "item-description" }],
      width: 590,
      height: 450,
    });
  }

  async _render(force = false, options = {}) {
    LOGGER.trace("_render | CPRItemSheet | Called.");

    await super._render(force, options);
    if (!Object.keys(options).some((k) => ((k === "action") && (options[k] === "update")))) {
      // In case of updating a value on an item sheet the resizing should not happen.
      // If a value is updated the _render function is called with options = { action: "update" }
      // Should one still desire resizing the sheet afterwards, please call _automaticResize explicitly.
      // Additionally if one item owned by an actor is updated, all items, which were opened before
      // are called with options = { action: "update" }.
      this._automaticResize();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  get template() {
    LOGGER.trace("template | CPRItemSheet | Called.");
    return `systems/cyberpunk-red-core/templates/item/cpr-item-sheet.hbs`;
  }

  get classes() {
    LOGGER.trace("classes | CPRItemSheet | Called.");
    return super.defaultOptions.classes.concat(["sheet", "item", `${this.item.type}`]);
  }

  /* --------------------------------------------
  Had to make this async to get await to work on the GetCoreSkills?  Not
  sure if that is the right way to do this?
  */
  /** @override */
  async getData() {
    LOGGER.trace("getData | CPRItemSheet | Called.");
    const foundryData = super.getData();
    const cprData = foundryData.item.system;
    // data.isGM = game.user.isGM;
    cprData.isGM = game.user.isGM;
    cprData.isOwned = this.object.isOwned;
    const itemType = foundryData.item.type;
    const mixins = SystemUtils.getDataModelTemplates(itemType);
    if (itemType === "role" || mixins.includes("attackable")) {
      // relativeSkills and relativeAmmo will be other items relevant to this one.
      // For owned objects, the item list will come from the character owner
      // For unowned objects, the item list will come from the core list of objects
      if (cprData.isOwned) {
        cprData.relativeSkills = this.object.actor.itemTypes.skill;
        cprData.relativeAmmo = this.object.actor.itemTypes.ammo;
      } else {
        const coreSkills = await SystemUtils.GetCoreSkills();
        const worldSkills = game.items.filter((i) => i.type === "skill");
        cprData.relativeSkills = coreSkills.concat(worldSkills);
      }
    }

    cprData.dvTableNames = DvUtils.GetDvTables();
    foundryData.item.system = cprData;
    return foundryData;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRItemSheet | Called.");
    super.activateListeners(html);
    if (!this.options.editable) return;

    // Select all text when grabbing text input.
    $("input[type=text]").focusin(() => $(this).select());

    // generic listeners
    html.find(".item-checkbox").click((event) => this._itemCheckboxToggle(event));

    html.find(".item-multi-option").click((event) => this._itemMultiOption(event));

    html.find(".select-compatible-ammo").click(() => this._selectCompatibleAmmo());

    html.find(".netarch-level-action").click((event) => this._netarchLevelAction(event));

    html.find(".netarch-roll-level").click(() => this._netarchGenerateFromTables());

    html.find(".role-ability-action").click((event) => this._roleAbilityAction(event));

    html.find(".select-role-bonuses").click((event) => this._selectRoleBonuses(event));

    html.find(".select-subrole-bonuses").click((event) => this._selectSubroleBonuses(event));

    html.find(".manage-installed-programs").click(() => this._manageInstalledItems("program"));

    html.find(".manage-installed-upgrades").click(() => this._manageInstalledItems("itemUpgrade"));

    html.find(".manage-installed-items").click(() => this._manageInstalledItems());

    html.find(".program-uninstall").click((event) => this._uninstallSingleItem(event));

    html.find(".remove-upgrade").click((event) => this._uninstallSingleItem(event));

    html.find(".item-view").click((event) => this._renderReadOnlyItemCard(event));

    html.find(".manage-installable-types").click((event) => this._manageInstallableTypes(event));

    html.find(".netarch-generate-auto").click(() => {
      if (game.user.isGM) {
        this.item._generateNetarchScene();
      } else {
        SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.netArchitecture.generation.noGMError"));
      }
    });

    html.find(".netarch-generate-custom").click(() => {
      if (game.user.isGM) {
        this.item._customize();
      } else {
        SystemUtils.DisplayMessage("error", SystemUtils.Localize("CPR.netArchitecture.generation.noGMError"));
      }
    });

    html.find(".netarch-item-link").click((event) => this._openItemFromId(event));

    // Active Effects listener
    html.find(".effect-control").click((event) => this.item.manageEffects(event));

    // Sheet resizing
    html.find(".tab-label").click(() => this._automaticResize());

    // Set up right click context menu when clicking on Item's image
    this._createItemImageContextMenu(html);
  }

  /*
  INTERNAL METHODS BELOW HERE
  */

  _itemCheckboxToggle(event) {
    LOGGER.trace("_itemCheckboxToggle | CPRItemSheet | Called.");
    const cprItem = duplicate(this.item);
    const target = SystemUtils.GetEventDatum(event, "data-target");
    const value = !getProperty(cprItem, target);
    if (target === "system.concealable.concealable") {
      this.item.setConcealable(value);
    } else if (hasProperty(cprItem, target)) {
      setProperty(cprItem, target, value);
      this.item.update(cprItem);
      LOGGER.log(`Item ${this.item.id} ${target} set to ${value}`);
      this._automaticResize(); // Resize the sheet as length of settings list might have changed
    }
  }

  async _itemMultiOption(event) {
    LOGGER.trace("_itemMultiOption | CPRItemSheet | Called.");
    const cprItem = duplicate(this.item);
    // the target the option wants to be put into
    const target = $(event.currentTarget).parents(".item-multi-select").attr("data-target");
    const value = SystemUtils.GetEventDatum(event, "data-value");
    if (hasProperty(cprItem, target)) {
      const prop = getProperty(cprItem, target);
      if (prop.includes(value)) {
        prop.splice(prop.indexOf(value), 1);
      } else {
        prop.push(value);
      }
      setProperty(cprItem, target, prop);
      this.item.update(cprItem);
      this._automaticResize(); // Resize the sheet as length of settings list might have changed
    }
  }

  async _selectCompatibleAmmo() {
    LOGGER.trace("_selectCompatibleAmmo | CPRItemSheet | Called.");
    const cprItemData = this.item.system;
    let formData = { id: this.item._id, name: this.item.name, system: cprItemData };
    formData = await SelectCompatibleAmmo.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    if (formData.selectedAmmo) {
      await this.item.setCompatibleAmmo(formData.selectedAmmo);
      this._automaticResize(); // Resize the sheet as length of ammo list might have changed
    }
  }

  async _selectRoleBonuses() {
    LOGGER.trace("ItemSheet | _selectRoleBonuses | Called.");
    const cprItemData = this.item.system;
    const roleType = "mainRole";
    const pack = game.packs.get("cyberpunk-red-core.skills");
    const coreSkills = await pack.getDocuments();
    const customSkills = game.items.filter((i) => i.type === "skill");
    const allSkills = this.object.isOwned ? this.actor.itemTypes.skill
      : coreSkills.concat(customSkills).sort((a, b) => (a.name > b.name ? 1 : -1));
    const allSkillsData = [];
    allSkills.forEach((a) => allSkillsData.push({ name: a.name, core: a.system.core }));
    let formData = { skillList: allSkillsData, roleType, system: cprItemData };
    formData = await SelectRoleBonuses.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    if (formData.selectedSkills) {
      const skillBonusObjects = [];
      const universalBonusesList = [];
      formData.selectedSkills.forEach((s) => {
        skillBonusObjects.push(allSkills.find((a) => a.name === s));
      });
      formData.selectedUniversalBonuses.forEach((b) => {
        universalBonusesList.push(b);
      });
      const { bonusRatio } = formData;
      this.item.update({
        "data.bonuses": skillBonusObjects,
        "data.universalBonuses": universalBonusesList,
        "data.bonusRatio": bonusRatio,
      });
      this._automaticResize(); // Resize the sheet as length of ammo list might have changed
    }
  }

  async _selectSubroleBonuses(event) {
    LOGGER.trace("ItemSheet | _selectSubroleBonuses | Called.");
    const subRoleName = SystemUtils.GetEventDatum(event, "data-item-name");
    const cprItemData = duplicate(this.item.system);
    const roleType = "subRole";
    const subRole = cprItemData.abilities.find((a) => a.name === subRoleName);
    const pack = game.packs.get("cyberpunk-red-core.skills");
    const coreSkills = await pack.getDocuments();
    const customSkills = game.items.filter((i) => i.type === "skill");
    const allSkills = this.object.isOwned ? this.actor.itemTypes.skill
      : coreSkills.concat(customSkills).sort((a, b) => (a.name > b.name ? 1 : -1));
    const allSkillsData = [];
    allSkills.forEach((a) => allSkillsData.push({ name: a.name, core: a.system.core }));

    let formData = {
      skillList: allSkillsData, roleType, subRole, system: cprItemData,
    };
    formData = await SelectRoleBonuses.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    if (formData.selectedSkills) {
      const skillBonusObjects = [];
      const universalBonusesList = [];
      formData.selectedSkills.forEach((s) => {
        skillBonusObjects.push(allSkills.find((a) => a.name === s));
      });
      formData.selectedUniversalBonuses.forEach((b) => {
        universalBonusesList.push(b);
      });
      setProperty(subRole, "bonuses", skillBonusObjects);
      setProperty(subRole, "universalBonuses", universalBonusesList);
      setProperty(subRole, "bonusRatio", formData.bonusRatio);
      this.item.update({ system: cprItemData });
      if (this.actor) {
        await this.actor.updateEmbeddedDocuments("Item", [{ _id: this.item.id, system: cprItemData }]);
      }
    }
  }

  _automaticResize() {
    LOGGER.trace("_automaticResize | CPRItemSheet | Called.");
    const setting = game.settings.get("cyberpunk-red-core", "automaticallyResizeSheets");
    if (setting && this.rendered && !this._minimized) {
      // It seems that the size of the content does not change immediately upon updating the content
      setTimeout(() => {
        this.setPosition({ width: this.position.width, height: 35 }); // Make sheet small, so this.form.offsetHeight does not include whitespace
        this.setPosition({ width: this.position.width, height: this.form.offsetHeight + 46 }); // 30px for the header and 8px top margin 8px bottom margin
      }, 10);
    }
  }

  async _netarchGenerateFromTables() {
    LOGGER.trace("_netarchGenerateFromTables | CPRItemSheet | Called.");
    const formData = await NetarchRolltableGenerationPrompt.RenderPrompt().catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    const packName = "cyberpunk-red-core.net-rolltables";
    const packIndex = await game.packs.get(packName).getIndex();
    const lobby = await game.packs.get(packName).getDocument(packIndex.contents.filter((i) => i.name === "First Two Floors (The Lobby)")[0]._id);
    const other = await game.packs.get(packName).getDocument(packIndex.contents.filter((i) => i.name === "All Other Floors (".concat(formData.difficulty, ")"))[0]._id);
    const numberOfFloorsRoll = new CPRRoll(SystemUtils.Localize("CPR.rolls.roll"), "3d6");
    await numberOfFloorsRoll.roll();
    const numberOfFloors = numberOfFloorsRoll.resultTotal;
    const branchCheck = new CPRRoll(SystemUtils.Localize("CPR.rolls.roll"), "1d10");
    await branchCheck.roll();
    let branchCounter = 0;
    while (branchCheck.initialRoll >= 7) {
      branchCounter += 1;
      if (branchCounter > 7) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await branchCheck.roll();
    }
    let floors = await this._netarchDrawFromTableCustom(lobby, 2);
    if (numberOfFloors > 2) {
      floors = floors.concat(await this._netarchDrawFromTableCustom(other, numberOfFloors - 2));
    }
    const prop = [];
    let index = 0;
    let floorIndex = 1;
    let minfloorIndexbranch = 3;
    let branch = "a";
    floors.forEach((floor) => {
      let content = "CPR.global.programClass.blackice";
      if (floor.results[0].text.match("^Password")) {
        content = "CPR.netArchitecture.floor.options.password";
      }
      if (floor.results[0].text.match("^File")) {
        content = "CPR.netArchitecture.floor.options.file";
      }
      if (floor.results[0].text.match("^Control Node")) {
        content = "CPR.netArchitecture.floor.options.controlnode";
      }
      let dv = "N/A";
      const dvRegex = /DV([0-9]+)/g;
      const match = dvRegex.exec(floor.results[0].text);
      if (match !== null && match.length > 1) {
        [, dv] = match;
      }
      let blackice = "--";
      if (content.match("blackice")) {
        switch (floor.results[0].text) {
          case "Asp":
            blackice = "CPR.netArchitecture.floor.options.blackIce.asp";
            break;
          case "Giant":
            blackice = "CPR.netArchitecture.floor.options.blackIce.giant";
            break;
          case "Hellhound":
            blackice = "CPR.netArchitecture.floor.options.blackIce.hellhound";
            break;
          case "Kraken":
            blackice = "CPR.netArchitecture.floor.options.blackIce.kraken";
            break;
          case "Liche":
            blackice = "CPR.netArchitecture.floor.options.blackIce.liche";
            break;
          case "Raven":
            blackice = "CPR.netArchitecture.floor.options.blackIce.raven";
            break;
          case "Scorpion":
            blackice = "CPR.netArchitecture.floor.options.blackIce.scorpion";
            break;
          case "Skunk":
            blackice = "CPR.netArchitecture.floor.options.blackIce.skunk";
            break;
          case "Wisp":
            blackice = "CPR.netArchitecture.floor.options.blackIce.wisp";
            break;
          case "Dragon":
            blackice = "CPR.netArchitecture.floor.options.blackIce.dragon";
            break;
          case "Killer":
            blackice = "CPR.netArchitecture.floor.options.blackIce.killer";
            break;
          case "Sabertooth":
            blackice = "CPR.netArchitecture.floor.options.blackIce.sabertooth";
            break;
          default:
            break;
        }
      }
      if (branchCounter > 0 && floorIndex > minfloorIndexbranch && floorIndex > numberOfFloors / (branchCounter + 1) && index !== numberOfFloors - 1) {
        floorIndex = minfloorIndexbranch;
        minfloorIndexbranch += 1;
        branch = String.fromCharCode(branch.charCodeAt() + 1);
        branchCounter -= 1;
      }
      prop.push({
        index,
        floor: (floorIndex).toString(),
        branch,
        dv,
        content,
        blackice,
        description: "Roll ".concat(floor.roll.total.toString(), ": ", floor.results[0].text),
      });
      index += 1;
      floorIndex += 1;
    });
    const cprItemData = duplicate(this.item.system);
    setProperty(cprItemData, "floors", prop);
    this.item.update({ system: cprItemData });
    this._automaticResize(); // Resize the sheet as length of settings list might have changed
  }

  // eslint-disable-next-line class-methods-use-this
  async _netarchDrawFromTableCustom(table, number) {
    LOGGER.trace("_netarchDrawFromTableCustom | CPRItemSheet | Called.");
    let abortCounter = 0;
    const drawDuplicatesRegex = "^File|^Control Node";
    const drawnNumbers = [];
    const drawnResults = [];
    while (drawnResults.length < number) {
      // eslint-disable-next-line no-await-in-loop
      const res = await table.draw({ displayChat: false });
      if (!drawnNumbers.includes(res.roll.total)) {
        if (!res.results[0].text.match(drawDuplicatesRegex)) {
          drawnNumbers.push(res.roll.total);
        }
        drawnResults.push(res);
      }
      abortCounter += 1;
      if (abortCounter > 1000) {
        break;
      }
    }
    return drawnResults;
  }

  async _netarchLevelAction(event) {
    LOGGER.trace("_netarchLevelAction | CPRItemSheet | Called.");
    const target = Number(SystemUtils.GetEventDatum(event, "data-action-target"));
    const action = SystemUtils.GetEventDatum(event, "data-action-type");
    const cprItemData = duplicate(this.item.system);

    if (action === "delete") {
      const setting = game.settings.get("cyberpunk-red-core", "deleteItemConfirmation");
      if (setting) {
        const promptMessage = `${SystemUtils.Localize("CPR.dialog.deleteConfirmation.message")} ${SystemUtils.Localize("CPR.netArchitecture.floor.deleteConfirmation")}?`;
        const confirmDelete = await ConfirmPrompt.RenderPrompt(
          SystemUtils.Localize("CPR.dialog.deleteConfirmation.title"),
          promptMessage,
        );
        if (!confirmDelete) {
          return;
        }
      }
      if (hasProperty(cprItemData, "floors")) {
        const prop = getProperty(cprItemData, "floors");
        let deleteElement = null;
        prop.forEach((floor) => { if (floor.index === target) { deleteElement = floor; } });
        prop.splice(prop.indexOf(deleteElement), 1);
        setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      }
    }

    if (action === "up" || action === "down") {
      if (hasProperty(cprItemData, "floors")) {
        const prop = getProperty(cprItemData, "floors");
        const indices = [];
        prop.forEach((floor) => { indices.push(floor.index); });
        let swapPartner = null;
        if (action === "up") {
          swapPartner = Math.min(...indices);
        } else {
          swapPartner = Math.max(...indices);
        }
        if (target !== swapPartner) {
          if (action === "up") {
            indices.forEach((i) => { if (i < target && i > swapPartner) { swapPartner = i; } });
          } else {
            indices.forEach((i) => { if (i > target && i < swapPartner) { swapPartner = i; } });
          }
          let element1 = null;
          let element2 = null;
          prop.forEach((floor) => { if (floor.index === target) { element1 = floor; } });
          prop.forEach((floor) => { if (floor.index === swapPartner) { element2 = floor; } });
          const newElement1 = duplicate(element1);
          const newElement2 = duplicate(element2);
          prop.splice(prop.indexOf(element1), 1);
          prop.splice(prop.indexOf(element2), 1);
          newElement1.index = swapPartner;
          newElement2.index = target;
          prop.push(newElement1);
          prop.push(newElement2);
          setProperty(cprItemData, "floors", prop);
          this.item.update({ system: cprItemData });
        }
      }
    }

    if (action === "create") {
      let formData = {
        floornumbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18"],
        branchlabels: ["a", "b", "c", "d", "e", "f", "g", "h"],
        dvoptions: ["N/A", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
        contentoptions: {
          "CPR.netArchitecture.floor.options.password": SystemUtils.Localize("CPR.netArchitecture.floor.options.password"),
          "CPR.netArchitecture.floor.options.file": SystemUtils.Localize("CPR.netArchitecture.floor.options.file"),
          "CPR.netArchitecture.floor.options.controlnode": SystemUtils.Localize("CPR.netArchitecture.floor.options.controlnode"),
          "CPR.global.programClass.blackice": SystemUtils.Localize("CPR.global.programClass.blackice"),
        },
        blackiceoptions: {
          "--": "--",
          "CPR.netArchitecture.floor.options.blackIce.asp": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.asp"),
          "CPR.netArchitecture.floor.options.blackIce.giant": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.giant"),
          "CPR.netArchitecture.floor.options.blackIce.hellhound": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.hellhound"),
          "CPR.netArchitecture.floor.options.blackIce.kraken": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.kraken"),
          "CPR.netArchitecture.floor.options.blackIce.liche": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.liche"),
          "CPR.netArchitecture.floor.options.blackIce.raven": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.raven"),
          "CPR.netArchitecture.floor.options.blackIce.scorpion": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.scorpion"),
          "CPR.netArchitecture.floor.options.blackIce.skunk": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.skunk"),
          "CPR.netArchitecture.floor.options.blackIce.wisp": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.wisp"),
          "CPR.netArchitecture.floor.options.blackIce.dragon": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.dragon"),
          "CPR.netArchitecture.floor.options.blackIce.killer": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.killer"),
          "CPR.netArchitecture.floor.options.blackIce.sabertooth": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.sabertooth"),
        },
        floor: "1",
        branch: "a",
        dv: "N/A",
        content: SystemUtils.Localize("CPR.netArchitecture.floor.options.password"),
        blackice: "--",
        description: "",
        returnType: "string",
      };
      formData = await NetarchLevelPrompt.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
      if (formData === undefined) {
        return;
      }

      if (hasProperty(cprItemData, "floors")) {
        const prop = getProperty(cprItemData, "floors");
        let maxIndex = -1;
        prop.forEach((floor) => { if (floor.index > maxIndex) { maxIndex = floor.index; } });
        prop.push({
          index: maxIndex + 1,
          floor: formData.floor,
          branch: formData.branch,
          dv: formData.dv,
          content: formData.content,
          blackice: formData.blackice,
          description: formData.description,
        });
        setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      } else {
        const prop = [{
          index: 0,
          floor: formData.floor,
          branch: formData.branch,
          dv: formData.dv,
          content: formData.content,
          blackice: formData.blackice,
          description: formData.description,
        }];
        setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      }
    }

    if (action === "edit") {
      if (hasProperty(cprItemData, "floors")) {
        const prop = getProperty(cprItemData, "floors");
        let editElement = null;
        prop.forEach((floor) => { if (floor.index === target) { editElement = floor; } });
        let formData = {
          floornumbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18"],
          branchlabels: ["a", "b", "c", "d", "e", "f", "g", "h"],
          dvoptions: ["N/A", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
          contentoptions: {
            "CPR.netArchitecture.floor.options.password": SystemUtils.Localize("CPR.netArchitecture.floor.options.password"),
            "CPR.netArchitecture.floor.options.file": SystemUtils.Localize("CPR.netArchitecture.floor.options.file"),
            "CPR.netArchitecture.floor.options.controlnode": SystemUtils.Localize("CPR.netArchitecture.floor.options.controlnode"),
            "CPR.global.programClass.blackice": SystemUtils.Localize("CPR.global.programClass.blackice"),
          },
          blackiceoptions: {
            "--": "--",
            "CPR.netArchitecture.floor.options.blackIce.asp": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.asp"),
            "CPR.netArchitecture.floor.options.blackIce.giant": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.giant"),
            "CPR.netArchitecture.floor.options.blackIce.hellhound": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.hellhound"),
            "CPR.netArchitecture.floor.options.blackIce.kraken": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.kraken"),
            "CPR.netArchitecture.floor.options.blackIce.liche": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.liche"),
            "CPR.netArchitecture.floor.options.blackIce.raven": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.raven"),
            "CPR.netArchitecture.floor.options.blackIce.scorpion": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.scorpion"),
            "CPR.netArchitecture.floor.options.blackIce.skunk": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.skunk"),
            "CPR.netArchitecture.floor.options.blackIce.wisp": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.wisp"),
            "CPR.netArchitecture.floor.options.blackIce.dragon": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.dragon"),
            "CPR.netArchitecture.floor.options.blackIce.killer": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.killer"),
            "CPR.netArchitecture.floor.options.blackIce.sabertooth": SystemUtils.Localize("CPR.netArchitecture.floor.options.blackIce.sabertooth"),
          },
          floor: editElement.floor,
          branch: editElement.branch,
          dv: editElement.dv,
          content: editElement.content,
          blackice: editElement.blackice,
          description: editElement.description,
          returnType: "string",
        };
        formData = await NetarchLevelPrompt.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
        if (formData === undefined) {
          return;
        }
        prop.splice(prop.indexOf(editElement), 1);
        prop.push({
          index: editElement.index,
          floor: formData.floor,
          branch: formData.branch,
          dv: formData.dv,
          content: formData.content,
          blackice: formData.blackice,
          description: formData.description,
        });
        setProperty(cprItemData, "floors", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _openItemFromId(event) {
    LOGGER.trace("_openItemFromId | CPRItemSheet | Called.");
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const itemEntity = game.items.get(itemId);
    if (itemEntity !== null) {
      itemEntity.sheet.render(true);
    } else {
      SystemUtils.DisplayMessage("error", SystemUtils.Format("CPR.messages.itemDoesNotExistError", { itemid: itemId }));
    }
  }

  // Installed Item Code

  async _manageInstalledItems(itemType) {
    LOGGER.trace("_manageInstalledItems | CPRItemSheet | Called.");
    const { item } = this;

    // We only support upgraded items that are owned by an actor
    // Get the actor that owns this item (if owned)

    const actor = (item.isOwned) ? item.actor : false;

    /*
    if (!actor || (actor.type !== "character" && actor.type !== "mook")) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.ownedItemOnlyError"));
      return;
    }
    */
    const promptResult = await this._selectInstallableItems(itemType);

    if (Object.keys(promptResult).length === 0) {
      return;
    }

    let installedItemChanges = [];
    if (promptResult.uninstallableItems.length > 0) {
      const changeResult = await item.uninstallItems(promptResult.uninstallableItems);
      if (Array.isArray(changeResult)) {
        // Returned actor.updatedEmbeddedDocuments() so it is an owned item
        installedItemChanges = installedItemChanges.concat(changeResult.filter((i) => i._id !== item._id));
      } else {
        // Returned item.update() so it is a world item
        installedItemChanges = installedItemChanges.concat(promptResult.uninstallableItems);
      }
    }

    if (promptResult.installableItems.length > 0) {
      const changeResult = await item.installItems(promptResult.installableItems);
      if (Array.isArray(changeResult)) {
        // Returned actor.updatedEmbeddedDocuments() so it is an owned item
        installedItemChanges = installedItemChanges.concat(changeResult.filter((i) => i._id !== item._id));
      } else {
        // Returned item.update() so it is a world item
        installedItemChanges = installedItemChanges.concat(promptResult.installableItems);
      }
    }

    if (installedItemChanges.filter((i) => i.type === "itemUpgrade").length > 0) {
      await item.syncUpgrades(installedItemChanges.filter((i) => i.type === "itemUpgrade"));
    }

    if (installedItemChanges.filter((i) => i.type === "program").length > 0) {
      await item.syncPrograms(installedItemChanges.filter((i) => i.type === "program"));
    }
  }

  async _uninstallSingleItem(event) {
    LOGGER.trace("_uninstallSingleItem | CPRItemSheet | Called.");
    const installedItemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const { item } = this;
    const actor = (this.item.isOwned) ? this.item.actor : null;

    const installedItem = (!actor) ? fromUuidSync(installedItemId) : actor.getOwnedItem(installedItemId);
    await item.uninstallItems([installedItem]);

    if (installedItem.type === "itemUpgrade") {
      await item.syncUpgrades();
    }

    if (installedItem.type === "program") {
      await item.syncPrograms();
    }
  }

  async _roleAbilityAction(event) {
    LOGGER.trace("ItemSheet | _roleAbilityAction | Called.");
    const target = Number(SystemUtils.GetEventDatum(event, "data-action-target"));
    const action = SystemUtils.GetEventDatum(event, "data-action-type");
    const cprItemData = duplicate(this.item.system);
    const pack = game.packs.get("cyberpunk-red-core.skills");
    const coreSkills = await pack.getDocuments();
    const customSkills = game.items.filter((i) => i.type === "skill");
    const allSkills = this.object.isOwned ? this.actor.itemTypes.skill
      : coreSkills.concat(customSkills).sort((a, b) => (a.name > b.name ? 1 : -1));
    if (action === "create") {
      let formData = {
        name: "",
        rank: 0,
        multiplierOptions: [0.25, 0.5, 1, 2],
        multiplier: 1,
        stat: "--",
        skillOptions: allSkills,
        skill: "--",
        hasRoll: false,
        returnType: "array",
      };

      formData = await RoleAbilityPrompt.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
      if (formData === undefined) {
        return;
      }
      // eslint-disable-next-line no-nested-ternary
      const skillObject = (formData.skill !== "--") && (formData.skill !== "varying") ? allSkills.find((a) => a.name === formData.skill)
        : (formData.skill === "varying") ? "varying"
          : "--";
      if (hasProperty(cprItemData, "abilities")) {
        const prop = getProperty(cprItemData, "abilities");
        let maxIndex = -1;
        prop.forEach((ability) => { if (ability.index > maxIndex) { maxIndex = ability.index; } });
        prop.push({
          index: maxIndex + 1,
          name: formData.name,
          rank: formData.rank,
          multiplier: formData.multiplier,
          stat: formData.stat,
          skill: skillObject,
          bonuses: [],
          universalBonuses: [],
          bonusRatio: 1,
          hasRoll: formData.hasRoll,
        });
        setProperty(cprItemData, "abilities", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      } else {
        const prop = [{
          index: 0,
          name: formData.name,
          rank: formData.rank,
          multiplier: formData.multiplier,
          stat: formData.stat,
          skill: skillObject,
          bonuses: [],
          universalBonuses: [],
          bonusRatio: 1,
          hasRoll: formData.hasRoll,
        }];
        setProperty(cprItemData, "abilities", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      }
    }

    if (action === "delete") {
      const setting = game.settings.get("cyberpunk-red-core", "deleteItemConfirmation");
      if (setting) {
        const promptMessage = `${SystemUtils.Localize("CPR.dialog.deleteConfirmation.message")} ${SystemUtils.Localize("CPR.itemSheet.role.deleteConfirmation")}?`;
        const confirmDelete = await ConfirmPrompt.RenderPrompt(
          SystemUtils.Localize("CPR.dialog.deleteConfirmation.title"),
          promptMessage,
        );
        if (!confirmDelete) {
          return;
        }
      }
      if (hasProperty(cprItemData, "abilities")) {
        const prop = getProperty(cprItemData, "abilities");
        let deleteElement = null;
        prop.forEach((ability) => { if (ability.index === target) { deleteElement = ability; } });
        prop.splice(prop.indexOf(deleteElement), 1);
        setProperty(cprItemData, "abilities", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      }
    }

    if (action === "edit") {
      if (hasProperty(cprItemData, "abilities")) {
        const prop = getProperty(cprItemData, "abilities");
        let editElement = null;
        prop.forEach((ability) => { if (ability.index === target) { editElement = ability; } });
        const editElementSkill = (editElement.skill !== "--") && (editElement.skill !== "varying") ? editElement.skill.name : editElement.skill;
        let formData = {
          name: editElement.name,
          rank: editElement.rank,
          multiplierOptions: [0.25, 0.5, 1, 2],
          multiplier: editElement.multiplier,
          stat: editElement.stat,
          skillOptions: allSkills,
          skill: editElementSkill,
          hasRoll: editElement.hasRoll,
          returnType: "array",
        };
        formData = await RoleAbilityPrompt.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
        if (formData === undefined) {
          return;
        }
        // eslint-disable-next-line no-nested-ternary
        const skillObject = (formData.skill !== "--") && (formData.skill !== "varying") ? allSkills.find((a) => a.name === formData.skill)
          : (formData.skill === "varying") ? "varying"
            : "--";
        prop.splice(prop.indexOf(editElement), 1);
        prop.push({
          index: editElement.index,
          name: formData.name,
          rank: formData.rank,
          multiplier: formData.multiplier,
          stat: formData.stat,
          skill: skillObject,
          bonuses: editElement.bonuses,
          universalBonuses: editElement.universalBonuses,
          bonusRatio: editElement.bonusRatio,
          hasRoll: formData.hasRoll,
        });
        setProperty(cprItemData, "abilities", prop);
        this.item.update({ system: cprItemData });
        this._automaticResize(); // Resize the sheet as length of settings list might have changed
      }
    }
  }

  async _selectInstallableItems(itemType = false) {
    LOGGER.trace("_selectInstallableItems | CPRItemSheet | Called.");
    const installTarget = this.item;

    const actor = (installTarget.isOwned) ? installTarget.actor : false;

    /*
    if (!actor || (actor.type !== "character" && actor.type !== "mook")) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.ownedItemOnlyError"));
      return {};
    }
    */

    // First get all items that are installed in this.
    const installedItems = itemType ? installTarget.getInstalledItems(itemType) : installTarget.getInstalledItems();

    // Next get all uninstalled items that
    let uninstalledItems = (!actor) ? game.items.filter((item) => this.item.system.installedItems.allowedTypes.includes(item.type)
                                                          && item.system.isInstalled === false)
      : actor.items.filter((item) => this.item.system.installedItems.allowedTypes.includes(item.type)
                                      && item.system.isInstalled === false);

    // Remove itemUpgrades that are not upgrades for this installTarget.type
    uninstalledItems = uninstalledItems.filter((item) => item.type !== "itemUpgrade" || (item.type === "itemUpgrade" && item.system.type === installTarget.type));

    if (itemType) {
      uninstalledItems = (itemType === "itemUpgrade")
        ? uninstalledItems.filter((item) => item.type === itemType && item.system.type === installTarget.type)
        : uninstalledItems.filter((item) => item.type === itemType);
    }

    if (!actor) {
      for (const installedItem of installedItems) {
        uninstalledItems = uninstalledItems.filter((i) => i.uuid !== installedItem.uuid);
      }
    }
    let itemsList = [];

    for (const i of installedItems) {
      const itemData = {
        name: i.name,
        uuid: i.uuid,
        type: i.type,
        system: {
          isInstalled: true,
        },
      };
      if (i.type === "program") {
        itemData.system.class = i.system.class;
      }
      itemsList.push(itemData);
    }

    for (const i of uninstalledItems) {
      const itemData = {
        name: i.name,
        uuid: i.uuid,
        type: i.type,
        system: {
          isInstalled: false,
        },
      };
      if (i.type === "program") {
        itemData.system.class = i.system.class;
      }
      itemsList.push(itemData);
    }

    itemsList = itemsList.sort((a, b) => (a.name > b.name ? 1 : -1));

    const typeList = [];
    for (const item of itemsList) {
      if (!typeList.includes(item.type)) {
        typeList.push(item.type);
      }
    }

    typeList.sort();

    const availableSlots = this.item.availableInstallSlots();
    const totalSlots = availableSlots + this.item.system.installedItems.usedSlots;

    const dialogItemType = (itemType) ? SystemUtils.Localize(CPR.objectTypes[itemType]) : SystemUtils.Localize("CPR.global.generic.item");
    const dialogPromptTitle = `${SystemUtils.Localize(SystemUtils.Format("CPR.dialog.selectInstallableItems.title", { type: dialogItemType }))}
      | ${SystemUtils.Localize("CPR.global.generic.item")} ${SystemUtils.Localize("CPR.global.generic.slots")}: ${totalSlots}`;
    const dialogPromptText = SystemUtils.Localize(SystemUtils.Format(
      "CPR.dialog.selectInstallableItems.text",
      {
        type: dialogItemType,
        target: installTarget.name,
      },
    ));

    let formData = {
      target: installTarget,
      title: dialogPromptTitle,
      text: dialogPromptText,
      typeList,
      itemsList,
      itemType: dialogItemType,
      returnType: "array",
    };

    formData = await SelectInstallItemsPrompt.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return {};
    }

    const uninstallableItems = [];

    installedItems.forEach((item) => {
      if (!formData.selectedItems.includes(item._id)) {
        uninstallableItems.push(item);
      }
    });

    const installableItems = [];

    formData.selectedItems.forEach((itemId) => {
      if (installedItems.filter((item) => item._id === itemId).length === 0) {
        const installedItem = (!actor) ? fromUuidSync(itemId) : actor.getOwnedItem(itemId);
        installableItems.push(installedItem);
      }
    });

    const promptResult = {
      uninstallableItems,
      installableItems,
    };

    return promptResult;
  }

  /**
   * Render an item sheet in read-only mode, which is used on installed cyberware. This is to
   * prevent a user from editing data while it is installed, such as the foundation type.
   *
   * @private
   * @callback
   * @param {Object} event - object capturing event data (what was clicked and where?)
   */
  _renderReadOnlyItemCard(event) {
    LOGGER.trace("_renderReadOnlyItemCard | CPRItemSheet | Called.");
    const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
    const item = this.actor.items.find((i) => i._id === itemId);
    item.sheet.render(true, { editable: false });
  }

  /**
   * Sets up a ContextMenu that appears when the Item's image is right clicked.
   * Enables the user to share the image with other players.
   *
   * @param {Object} html - The DOM object
   * @returns {ContextMenu} The created ContextMenu
   */
  _createItemImageContextMenu(html) {
    LOGGER.trace("_createItemImageContextMenu | CPRItemSheet | Called.");
    return createImageContextMenu(html, ".item-image-block", this.item);
  }

  async _manageInstallableTypes() {
    LOGGER.trace("_manageInstallableTypes | CPRItemSheet | Called.");
    const installableTypes = this.item.system.installedItems.allowedTypes;
    let formData = {
      installableTypes,
    };
    formData = await ManageInstallableTypes.RenderPrompt(formData).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }
    const allowedTypes = formData.selectedTypes;
    if (!allowedTypes.includes("itemUpgrade")) {
      allowedTypes.push("itemUpgrade");
    }

    await this.item.update({ "system.installedItems.allowedTypes": allowedTypes });
  }
}
