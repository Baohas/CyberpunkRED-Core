/* eslint-disable no-shadow */
/* global renderTemplate FormDataExtended Dialog foundry game */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class ManageInstallableTypes {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | SelectItemUpgradePrompt | called.");
    const template = `systems/${game.system.id}/templates/dialog/cpr-select-item-upgrade-prompt.hbs`;
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog ManageInstallableTypes | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog ManageInstallableTypes | called.");
          const typeList = html.find("[name=\"selectedTypes\"");
          const selectedTypes = [];
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          Object.keys(typeList).forEach((type) => {
            if (typeList[type].checked) {
              selectedTypes.push(typeList[type].value);
            }
          });
          formData.selectedTypes = selectedTypes;
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.selectCompatibleAmmo.title"),
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
          render: LOGGER.trace("confirm | Dialog SelectRolesPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
