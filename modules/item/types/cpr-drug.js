import ConfirmPrompt from "../../dialog/cpr-confirmation-prompt.js";
import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import Rules from "../../utils/cpr-rules.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * Extend the base CPRItem object with things specific to drugs and consumables.
 * @extends {CPRItem}
 */
export default class CPRDrugItem extends CPRItem {
  /**
   * Consume (snort) a drug and enjoy its effects. This item action is a shorthand way to enable
   * the active effects it has and decrement the amount value by one.
   *
   * We cannot change the disabled flag on the AE from the Item itself because Foundry does not
   * support updating AEs coming from owned Items, so we do it on the corresponding actor AE.
   * Rather than mess with isSuppressed, we go straight to "not disabled".
   *
   * @async
   * @returns the updated info
   */
  async snort() {
    LOGGER.trace("snort | CPRDrugItem | called.");
    Rules.lawyer(this.data.data.amount > 0, SystemUtils.Localize("CPR.messages.notEnoughDrugs"));
    if (!await this._confirmSnort()) return;
    this.data.data.amount = Math.max(0, this.data.data.amount - 1);
    if (this.actor) {
      const originItem = `Item.${this.id}`;
      const actorEffects = this.actor.data.effects.filter((ae) => ae.data.origin.endsWith(originItem) && ae.usage === "snorted");
      const effectUpdates = [];
      actorEffects.forEach((ae) => {
        effectUpdates.push({ _id: ae.id, disabled: false });
      });
      this.actor.updateEmbeddedDocuments("ActiveEffect", effectUpdates); // update AEs
      this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, data: this.data.data }]); // update the amount
    }
    SystemUtils.DisplayMessage("notify", `${this.data.name} ${SystemUtils.Localize("CPR.messages.consumedDrug")}`);
  }

  /**
   * pops up a confirmation to consume a drug (yes/no)
   *
   * @async
   * @returns a promise
   */
  async _confirmSnort() {
    LOGGER.trace("_confirmSnort | CPRDrugItem | called.");
    const promptMessage = `${SystemUtils.Localize("CPR.dialog.snortConfirmation.message")} ${this.data.name}?`;
    return ConfirmPrompt.RenderPrompt(
      SystemUtils.Localize("CPR.dialog.snortConfirmation.title"), promptMessage,
    ).catch((err) => LOGGER.debug(err));
  }
}
