/* global renderTemplate, FormDataExtended, Dialog foundry */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

export default class VerifyRollPrompt {
  static async RenderPrompt(cprRoll) {
    LOGGER.trace("RenderPrompt | VerifyRollPrompt | called.");
    return new Promise((resolve, reject) => {
      renderTemplate(cprRoll.rollPrompt, cprRoll).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog VerifyRollPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        // eslint-disable-next-line no-shadow
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog VerifyRollPrompt | called.");

          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          if (formData.mods) {
            formData.mods = formData.mods.replace(/ +/g, ",");
            formData.mods = formData.mods.replace(/,+/g, ",");
            formData.mods = formData.mods.split(",").map(Number);
          } else {
            formData.mods = [];
          }
          switch (cprRoll.constructor.name) {
            case "CPRDamageRoll":
            case "CPRAttackRoll": {
              if (formData.autofire) {
                formData.fireMode = "autofire";
              }
              if (formData.suppressive) {
                formData.fireMode = "suppressive";
              }
              break;
            }
            default:
          }
          resolve(formData);
        };
        new Dialog({
          title: `Roll Confirmation for ${cprRoll.rollTitle}`,
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              callback: () => _onCancel(html),
            },
            confirm: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.confirm"),
              // eslint-disable-next-line no-shadow
              callback: (html) => _onConfirm(html),
            },
          },
          default: "confirm",
          render: LOGGER.trace("confirm | Dialog VerifyRollPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
