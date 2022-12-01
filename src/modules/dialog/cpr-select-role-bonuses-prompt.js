/* eslint-disable max-classes-per-file */
/* eslint-disable no-shadow */
/* global game renderTemplate FormDataExtended Dialog foundry duplicate mergeObject */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import CPRDialog from "./cpr-dialog-application.js";

export default class SelectRoleBonuses extends CPRDialog {
  constructor(dialogData, formData, options) {
    LOGGER.trace("constructor | CPRSelectRoleBonuses | Called.");
    super(dialogData, options);
    this.skillList = formData.skillList;
    this.roleType = formData.roleType;
    this.options.template = `systems/${game.system.id}/templates/dialog/cpr-select-role-bonuses-prompt.hbs`;
  }

  getData() {
    LOGGER.trace("getData | CPRSelectRoleBonuses | called.");
    const data = super.getData();
    data.skillList = this.skillList;
    data.roleType = this.roleType;
    data.roleData = this.object;
    return data;
  }

  async _updateObject(event, formData) {
    LOGGER.trace("_updateObject | CPRDialog | Called.");
    const fd = duplicate(formData);
    fd.system = {
      bonuses: formData.selectedSkills.filter((s) => s),
      universalBonuses: formData.universalBonuses.filter((b) => b),
    };
    mergeObject(this.object, fd);
    this.render(true); // rerenders the FormApp with the new data.
  }
}

export class SelectRoleBonuses2 {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | SelectRoleBonuses | called.");
    const template = `systems/${game.system.id}/templates/dialog/cpr-select-role-bonuses-prompt.hbs`;
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog SelectRoleBonusesPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog SelectRoleBonusesPrompt | called.");
          const skillList = html.find("[name=\"selectedSkills\"");
          const universalBonusList = html.find("[name=\"universalBonuses\"");
          const selectedSkills = [];
          const selectedUniversalBonuses = [];
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          Object.keys(skillList).forEach((skill) => {
            if (skillList[skill].checked) {
              selectedSkills.push(skillList[skill].value);
            }
          });
          Object.keys(universalBonusList).forEach((bonus) => {
            if (universalBonusList[bonus].checked) {
              selectedUniversalBonuses.push(universalBonusList[bonus].value);
            }
          });
          formData.selectedSkills = selectedSkills;
          formData.selectedUniversalBonuses = selectedUniversalBonuses;
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.selectRoleBonuses.title"),
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              callback: (html) => _onCancel(html),
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.confirm"),
              callback: (html) => _onConfirm(html),
            },
          },
          default: "confirm",
          render: LOGGER.trace("confirm | Dialog SelectRoleBonusesPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
