/* eslint-disable no-shadow */
/* global renderTemplate Dialog game */
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

export default class SelectRolesPrompt {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | SelectRolesPrompt | called.");
    const template = `systems/${game.system.id}/templates/dialog/cpr-select-roles-prompt.hbs`;
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog SelectRolesPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog SelectRolesPrompt | called.");
          const roleList = html.find("[name=\"activeRole\"");
          const netRoleList = html.find("[name=\"activeNetRole\"");
          let activeRole = "";
          let activeNetRole = "";
          const formData = {};
          Object.keys(roleList).forEach((role) => {
            if (roleList[role].checked) {
              activeRole = roleList[role].value;
            }
            if (netRoleList[role].checked) {
              activeNetRole = netRoleList[role].value;
            }
          });
          formData.activeRole = activeRole;
          formData.activeNetRole = activeNetRole;
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.selectRoles.title"),
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
