/* globals duplicate */
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRActor from "../../actor/cpr-actor.js";

const Installable = function Installable() {
  /**
   * installs this into target.
   *
   * @async
   * @param {Object} target - the item to install into
   * @returns - the updated item document
   */
  this.installInto = function installInto(target) {
    LOGGER.trace("installInto | Installable | Called.");
    if (!target) {
      return false;
    }

    if (!target.canInstallItem(this)) {
      if (!target.system.installedItems.allowed) {
        SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.installFailInvalidType"));
      } else {
        SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.installFailNoSlotsAvailable"));
      }
      return false;
    }

    let actor = null;
    if (target instanceof CPRActor) {
      actor = target;
    } else {
      actor = (target.isOwned) ? target.actor : null;
    }

    if (!actor) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.installFailItemNotOwned"));
      return false;
    }

    return this._updateEntities(actor, target, "install");
  };

  /**
   * uninstalls this from target.
   *
   * @async
   * @param {Object} target - the item to uninstall into
   * @returns - the updated item document
   */
  this.uninstallFrom = function uninstallFrom(target) {
    LOGGER.trace("uninstallFrom | Installable | Called.");
    if (!target) {
      return false;
    }

    let actor = null;
    if (target instanceof CPRActor) {
      actor = target;
    } else {
      actor = (target.isOwned) ? target.actor : null;
    }

    if (!actor) {
      SystemUtils.DisplayMessage("warn", SystemUtils.Localize("CPR.messages.installFailItemNotOwned"));
      return false;
    }

    return this._updateEntities(actor, target, "uninstall");
  };

  this._updateEntities = async function _updateEntities(actor, target, action) {
    const updateList = [];
    const targetInstalledItems = duplicate(target.system.installedItems);

    if (action === "install") {
      targetInstalledItems.list.push(this.uuid);
      updateList.push({ _id: this._id, "system.isInstalled": true, "system.installedIn": target.uuid });
    } else {
      const thisInstalledItems = duplicate(this.system.installedItems);
      targetInstalledItems.list = targetInstalledItems.list.filter((uuid) => uuid !== this.uuid);
      let uuidList = this.system.installedItems.list;
      while (uuidList.length > 0) {
        const loopList = uuidList;
        uuidList = [];
        for (const uuid of loopList) {
          const itemLookup = actor._getOwnedItem(uuid);
          const installedItems = duplicate(itemLookup.system.installedItems);
          thisInstalledItems.list = thisInstalledItems.list.filter((u) => u !== uuid);
          thisInstalledItems.usedSlots -= itemLookup.system.size;
          installedItems.list = [];
          installedItems.usedSlots = 0;
          updateList.push({
            _id: itemLookup._id, "system.isInstalled": false, "system.installedIn": "", "system.installedItems": installedItems,
          });
          uuidList = uuidList.concat(itemLookup.system.installedItems.list);
        }
      }
      updateList.push({
        _id: this._id, "system.isInstalled": false, "system.installedIn": "", "system.installedItems": thisInstalledItems,
      });
    }

    if (actor === target) {
      await actor.update({ "system.installedItems": targetInstalledItems });
    } else {
      targetInstalledItems.usedSlots = (action === "install") ? targetInstalledItems.usedSlots + this.system.size : targetInstalledItems.usedSlots - this.system.size;
      updateList.push({ _id: target._id, "system.installedItems": targetInstalledItems });
    }

    return actor.updateEmbeddedDocuments("Item", updateList);
  };
};

export default Installable;
