import SystemUtils from "../../utils/cpr-systemUtils.js";

/**
 * Behavioural mixin adding the ledger read/write API to an actor. A "ledger" is any property with a
 * `{ value, transactions }` shape (e.g. `wealth`, `reputation`, `improvementPoints`). Attached at
 * prepare time via `Ledgerable.call(this)` from `CPRActor.loadMixins` for actor types that compose
 * `LedgerableSchema` (character, mook, container).
 *
 * These are plain instance methods (no `super` chaining), so instance augmentation is a natural fit.
 */
const Ledgerable = function Ledgerable() {
  /**
   * Given a property name on the actor model, wipe out all records in the corresponding ledger
   * for it. Effectively this sets it back to [].
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - empty or null if the property was not found
   */
  this.clearLedger = function clearLedger(prop) {
    if (this.isLedgerProperty(prop)) {
      const valProp = `system.${prop}.value`;
      const ledgerProp = `system.${prop}.transactions`;
      this.update({
        [valProp]: 0,
        [ledgerProp]: [],
      });
      return foundry.utils.getProperty(this.system, prop);
    }
    return null;
  };

  /**
   * Change the value of a property and store a record of the change in the corresponding
   * ledger.
   *
   * @param {String} prop - name of the property that has a ledger
   * @param {Number} value - how much to increase or decrease the value by
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  this.deltaLedgerProperty = function deltaLedgerProperty(prop, value, reason) {
    if (this.isLedgerProperty(prop)) {
      // update "value"; it may be negative
      const valProp = `system.${prop}.value`;
      let newValue = foundry.utils.getProperty(this, valProp);
      newValue += value;
      // update the ledger with the change
      const ledgerProp = `system.${prop}.transactions`;
      const ledger = foundry.utils.getProperty(this, ledgerProp);
      if (value > 0) {
        ledger.push([
          SystemUtils.Format("CPR.ledger.increaseSentence", {
            property: prop,
            amount: value,
            total: newValue,
          }),
          reason,
        ]);
      } else {
        ledger.push([
          SystemUtils.Format("CPR.ledger.decreaseSentence", {
            property: prop,
            amount: -1 * value,
            total: newValue,
          }),
          reason,
        ]);
      }
      // update the actor and return the modified property
      this.update({
        [valProp]: newValue,
        [ledgerProp]: ledger,
      });
      return foundry.utils.getProperty(this.system, prop);
    }
    return null;
  };

  /**
   * Set the value of a property and store a record of the change in the corresponding
   * ledger. This is different from applying a delta, here we just set the value.
   *
   * @param {String} prop - name of the property that has a ledger
   * @param {Number} value - what to set the value to
   * @param {String} reason - a user-provided reason for the change
   * @returns {Number} (or null if not found)
   */
  this.setLedgerProperty = function setLedgerProperty(prop, value, reason) {
    if (this.isLedgerProperty(prop)) {
      const valProp = `system.${prop}.value`;
      const ledgerProp = `system.${prop}.transactions`;
      const ledger = foundry.utils.getProperty(this, ledgerProp);
      ledger.push([
        SystemUtils.Format("CPR.ledger.setSentence", {
          property: prop,
          total: value,
        }),
        reason,
      ]);
      this.update({
        [valProp]: value,
        [ledgerProp]: ledger,
      });
      return foundry.utils.getProperty(this.system, prop);
    }
    return null;
  };

  /**
   * Get all records from the associated ledger of a property.
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Array} - Each element is a tuple: [value, reason], or null if not found
   */
  this.listRecords = function listRecords(prop) {
    if (this.isLedgerProperty(prop)) {
      return foundry.utils.getProperty(this.system, `${prop}.transactions`);
    }
    return null;
  };

  /**
   * Return whether a property in actor data is a ledgerProperty. This means it has
   * two (sub-)properties, "value", and "transactions".
   *
   * @param {String} prop - name of the property that has a ledger
   * @returns {Boolean}
   */
  this.isLedgerProperty = function isLedgerProperty(prop) {
    const ledgerData = foundry.utils.getProperty(this.system, prop);
    if (!foundry.utils.hasProperty(ledgerData, "value")) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Format("CPR.ledger.errorMessage.missingValue", { prop }),
      );
      return false;
    }
    if (!foundry.utils.hasProperty(ledgerData, "transactions")) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Format("CPR.ledger.errorMessage.missingTransactions", {
          prop,
        }),
      );
      return false;
    }
    return true;
  };
};

export default Ledgerable;
