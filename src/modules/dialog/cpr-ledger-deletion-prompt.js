/* global renderTemplate, Dialog */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

export default class LedgerDeletionPrompt {
  // INFO - ConfirmPrompt is a generic prompt to display on confirming an action.
  // Based on type of action, setup data to display based on given input.
  // Call to RenderPrompt should take one object as input, based on input type, prepare template and titles...
  static async RenderPrompt(title, data) {
    LOGGER.trace("RenderPrompt | LedgerDeletionPrompt | called.");
    const template = "systems/cyberpunk-red-core/templates/dialog/cpr-ledger-deletion-prompt.hbs";
    return new Promise((resolve, reject) => {
      renderTemplate(template, data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog LedgerDeletionPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        const _onYesAdd = () => {
          LOGGER.trace("_onYesAdd | Dialog LedgerDeletionPrompt | called.");
          resolve({ action: true, sign: 1 });
        };
        const _onYesSubtract = () => {
          LOGGER.trace("_onYesSubtract | Dialog LedgerDeletionPrompt | called.");
          resolve({ action: true, sign: -1 });
        };
        const _onNo = () => {
          LOGGER.trace("_onNo | Dialog LedgerDeletionPrompt | called.");
          resolve({ action: false });
        };
        new Dialog({
          title,
          content: html,
          buttons: {
            cancel: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              callback: () => _onCancel(),
            },
            no: {
              icon: "<i class=\"fas fa-times\"></i>",
              label: SystemUtils.Localize("CPR.dialog.common.no"),
              callback: () => _onNo(),
            },
            yesAdd: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.ledgerDeletion.yesAdd"),
              callback: () => _onYesAdd(),
            },
            yesSubtract: {
              icon: "<i class=\"fas fa-check\"></i>",
              label: SystemUtils.Localize("CPR.dialog.ledgerDeletion.yesSubtract"),
              callback: () => _onYesSubtract(),
            },
          },
          default: "cancel",
          render: LOGGER.trace("confirm | Dialog LedgerDeletionPrompt | called."),
          close: () => {
            // Closing the window can be interpreded as pressing cancel.
            _onCancel();
          },
        }).render(true);
      });
    });
  }
}
