/* global renderTemplate, FormDataExtended, Dialog foundry */
import SystemUtils from "../utils/cpr-systemUtils.js";
import LOGGER from "../utils/cpr-logger.js";

export default class ContainerVendorSellToPrompt {
  static async RenderPrompt(data) {
    LOGGER.trace("RenderPrompt | ContainerVendorSellToPrompt | called.");
    return new Promise((resolve, reject) => {
      renderTemplate("systems/cyberpunk-red-core/templates/dialog/cpr-container-configure-sell-to-prompt.hbs", data).then((html) => {
        const _onCancel = () => {
          LOGGER.trace("_onCancel | Dialog ContainerVendorSellToPrompt | called.");
          reject(new Error("Promise rejected: Window Closed"));
        };
        // eslint-disable-next-line no-shadow
        const _onConfirm = (html) => {
          LOGGER.trace("_onConfirm | Dialog ContainerVendorSellToPrompt | called.");
          const purchasingItems = html.find("[name=\"buying\"");
          const purchasingItemsList = [];
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          Object.keys(purchasingItems).forEach((item) => {
            if (purchasingItems[item].checked) {
              purchasingItemsList.push(purchasingItems[item].value);
            }
          });
          formData.purchasingItems = purchasingItemsList;
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize("CPR.dialog.container.vendor.sellToTitle"),
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
          render: LOGGER.trace("confirm | Dialog ContainerVendorSellToPrompt | called."),
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
