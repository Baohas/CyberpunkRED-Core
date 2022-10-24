/* globals FormApplication mergeObject duplicate game setProperty getProperty */
import LedgerDeletionPrompt from "./cpr-ledger-deletion-prompt.js";
import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
/**
 * Form application to display the ledger property.
 */
export default class CPRLedger extends FormApplication {
  /**
   * Set default options for the ledger.
   * See https://foundryvtt.com/api/Application.html for the complete list of options available.
   *
   * @static
   * @override
   */
  static get defaultOptions() {
    LOGGER.trace("defaultOptions | CPRLedger | called.");
    return mergeObject(super.defaultOptions, {
      title: SystemUtils.Localize("CPR.ledger.title"),
      template: "systems/cyberpunk-red-core/templates/dialog/cpr-ledger-form.hbs",
      width: 600,
      height: 340,
    });
  }

  /**
   * Add listeners specific to the Ledger.
   *
   * @param {*} html - the DOM object
   */
  activateListeners(html) {
    LOGGER.trace("activateListeners | CPRLedger | called.");

    html.find(".delete-ledger-line").click((event) => this._deleteLedgerLine(event));

    super.activateListeners(html);
  }

  /**
   * Set the data used for rendereing the ledger.
   *
   * @return {Object} - a structured object representing ledger data.
   */
  getData() {
    LOGGER.trace("getData | CPRLedger | called.");
    const data = {
      ledgername: this.ledgername,
      contents: this.contents,
      isGM: game.user.isGM,
    };
    return data;
  }

  /**
   * Set the ledger contents
   * @param {*} name - Name of the ledger
   * @param {*} contents - Contents of the leger
   */
  setLedgerContent(name, contents) {
    LOGGER.trace("setLedgerContent | CPRLedger | called.");
    // Generates the localization strings for "CPR.ledger.wealth", "CPR.ledger.improvementpoints" and "CPR.ledger.reputation"
    // and maybe others in the future. This comment has been added to allow for automated checks
    // of localization strings in the code.
    this.name = name;
    this.ledgername = "CPR.ledger.".concat(name.toLowerCase());
    this.contents = duplicate(contents);
    this._makeLedgerReadable(name);
  }

  /**
   * Strip some part of the string to make the ledger more human readable.
   *
   * @param {String} name - Name of the ledger
   */
  _makeLedgerReadable(name) {
    LOGGER.trace("_makeLedgerReadable | CPRLedger | called.");
    this.contents.forEach((element, index) => {
      const tmp = element[0].replace(name, "").trim();
      this.contents[index][0] = tmp[0].toUpperCase() + tmp.slice(1);
    });
  }

  /**
   * Set the actor, whom owns the ledger. This is needed for ledger modifications.
   *
   * @param {Object} actor - Actor from which the ledger was called
   */
  setActor(actor) {
    LOGGER.trace("setActor | CPRLedger | called.");
    this.actor = actor;
  }

  /**
   * Delete a single line from the ledger of the actor and re-render the ledger afterwards.
   * This should only be available to the GM, as the button is hidden in the hbs file.
   *
   * @param {Object} event - Event Data contianing the line to delete
   */
  async _deleteLedgerLine(event) {
    LOGGER.trace("_deleteLedgerLine | CPRLedger | called.");
    const lineId = SystemUtils.GetEventDatum(event, "data-line");
    this.contents = duplicate(this.actor.listRecords(this.name));
    let numbers = this.contents[lineId][0].match(/\d+/g);
    if (numbers === null) {
      numbers = ["NaN"];
    }
    const promptContent = {
      transaction: this.contents[lineId][0],
      reason: this.contents[lineId][1],
      value: numbers[0],
    };
    // Check if value should also be changed.
    const confirmDelete = await LedgerDeletionPrompt.RenderPrompt(
      SystemUtils.Localize("CPR.dialog.ledgerDeletion.title"),
      promptContent,
    ).catch((err) => LOGGER.debug(err));
    if (confirmDelete === undefined) {
      return;
    }
    this.contents.splice(lineId, 1);
    const dataPointTransactions = `system.${this.name}.transactions`;
    const cprActorData = duplicate(this.actor);
    setProperty(cprActorData, dataPointTransactions, this.contents);
    // Change the value if desired.
    if (confirmDelete.action && numbers[0] !== "NaN") {
      const dataPointValue = `system.${this.name}.value`;
      const value = getProperty(cprActorData, dataPointValue);
      setProperty(cprActorData, dataPointValue, value + (confirmDelete.sign * numbers[0]));
    }
    await this.actor.update(cprActorData);
    this._makeLedgerReadable(this.name);
    this.render();
  }

  /**
   * Close the ledger
   *
   * @param {Object} options
   */
  close(options) {
    LOGGER.trace("close | CPRLedger | called.");
    super.close(options);
  }
}
