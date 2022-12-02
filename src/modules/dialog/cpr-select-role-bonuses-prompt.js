/* eslint-disable max-classes-per-file */
/* eslint-disable no-shadow */
/* global game renderTemplate FormDataExtended Dialog foundry duplicate mergeObject */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import CPRDialog from "./cpr-dialog-application.js";

export default class SelectRoleBonuses extends CPRDialog {
  constructor(dialogData, options) {
    LOGGER.trace("constructor | CPRSelectRoleBonuses | Called.");
    super(dialogData, options);
    this.skillList = dialogData.skillList;
    this.roleType = dialogData.roleType;
    if (this.roleType === "subRole") this.subRole = dialogData.subRole;
    this.roleData = dialogData.roleData;
    this.options.template = `systems/${game.system.id}/templates/dialog/cpr-select-role-bonuses-prompt.hbs`;
    this.options.title = SystemUtils.Localize("CPR.dialog.selectRoleBonuses.title");
  }

  getData() {
    LOGGER.trace("getData | CPRSelectRoleBonuses | called.");
    const data = super.getData();
    data.skillList = this.skillList;
    data.roleType = this.roleType;
    if (this.roleType === "subRole") data.subRole = this.subRole;
    data.roleData = this.roleData;
    return data;
  }

  async _updateObject(event, formData) {
    LOGGER.trace("_updateObject | CPRDialog | Called.");
    const fd = duplicate(formData);
    const bonuses = [];
    formData.selectedSkills.forEach((s) => {
      if (s) bonuses.push(this.skillList.find((a) => a.name === s));
    });
    const updatedData = {
      bonusRatio: formData.bonusRatio,
      isSituational: formData.isSituational,
      onByDefault: formData.onByDefault,
      bonuses,
      universalBonuses: formData.universalBonuses.filter((b) => b),
    };
    if (this.roleType === "mainRole") {
      fd.roleData = updatedData;
    } else {
      fd.subRole = updatedData;
    }
    mergeObject(this.object, fd);
    this.render(true); // rerenders the FormApp with the new data.
  }
}
