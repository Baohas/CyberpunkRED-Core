/* eslint-disable no-await-in-loop */
/* global fromUuidSync */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import SelectInstallTargetPrompt from "../../dialog/cpr-select-install-targets-prompt.js";

const Installable = function Installable() {
  /**
   * Install this item into a container type item
   *
   * @async
   */
  this.install = async function install() {
    LOGGER.trace("install | Installable | Called.");
    if (!this.actor) {
      return;
    }

    const { actor } = this;
    const installationType = this.type;
    const containerTypes = SystemUtils.GetTemplateItemTypes("container");

    const installationTargets = [];
    const installationTargetTypes = [];

    for (const containerType of containerTypes) {
      for (const item of actor.itemTypes[containerType]) {
        if (
          item.system.installedItems.allowed &&
          item.system.installedItems.allowedTypes.includes(installationType) &&
          item.availableInstallSlots() >= this.system.size
        ) {
          if (installationType === "itemUpgrade") {
            if (item.type === this.system.type) {
              installationTargets.push(item);
            }
          } else {
            installationTargets.push(item);
          }
          if (
            installationTargets.includes(item) &&
            !installationTargetTypes.includes(item.type)
          ) {
            installationTargetTypes.push(item.type);
          }
        }
      }
    }
    const dialogPromptText =
      installationTargets.length > 0
        ? SystemUtils.Format("CPR.dialog.selectInstallTarget.text", {
            installable: this.name,
          })
        : SystemUtils.Format("CPR.dialog.selectInstallTarget.noOptions", {
            target: this.name,
          });
    const dialogPromptTitle = SystemUtils.Localize(
      "CPR.dialog.selectInstallTarget.title"
    );
    let formData = {
      title: dialogPromptTitle,
      text: dialogPromptText,
      installationTargetTypes,
      installationTargets,
      system: {
        size: this.system.size,
      },
    };

    formData = await SelectInstallTargetPrompt.RenderPrompt(formData).catch(
      (err) => LOGGER.debug(err)
    );
    if (formData === undefined || formData.selectedTarget === null) {
      return;
    }

    const targetItem = actor.getOwnedItem(formData.selectedTarget);
    await targetItem.installItems([this]);

    if (installationType === "itemUpgrade") {
      await targetItem.syncUpgrades();
    }
  };

  /**
   * Install this item into a container type item
   *
   * @async
   */
  this.uninstall = async function uninstall() {
    LOGGER.trace("uninstall | Installable | Called.");
    const container = fromUuidSync(this.system.installedIn);
    if (typeof container !== "object") {
      return;
    }

    const updatedItems = await container.uninstallItems([this]);
    const upgradableTypes = SystemUtils.GetTemplateItemTypes("upgradable");

    for (const item of updatedItems) {
      if (upgradableTypes.includes(item.type)) {
        await item.syncUpgrades();
      }
    }
  };
};

export default Installable;
