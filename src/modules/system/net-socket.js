import LOGGER from "../utils/cpr-logger.js";

/**
 * GM socket relay for the Netrunning App. The shared board (floor reveals, ICE REZ, runner
 * positions) and Control-node ownership live on the GM-owned Access Point actor and its embedded
 * programs, which players cannot write directly. Players emit mutation requests over the socket;
 * the primary active GM applies them. When the caller is already a GM the mutation is applied
 * locally with no round-trip.
 */
export default class CPRNetSocket {
  /** Register the socket listener. Every client calls this once at ready. */
  static register() {
    game.socket.on(`system.${game.system.id}`, (message) => {
      // Only the primary active GM applies, so multiple connected GMs don't double-apply.
      if (game.users.activeGM?.id !== game.user.id) return;
      CPRNetSocket.#apply(message).catch((err) => LOGGER.error(err));
    });
  }

  /**
   * True if the shared state can be mutated right now: the caller is a GM, or a GM is online to
   * apply relayed requests. Warns the player when no GM is available.
   *
   * @returns {boolean}
   */
  static requireActiveGM() {
    if (game.user.isGM || game.users.activeGM) return true;
    ui.notifications.warn(
      game.i18n.localize("CPR.netArchitecture.app.noGMOnline"),
    );
    return false;
  }

  /**
   * Request a shared-state mutation. Applied directly if the caller is a GM, otherwise relayed to
   * the primary GM. A player with no GM online cannot mutate shared state (nothing would apply it),
   * so the request is refused with a warning.
   *
   * @param {String} action - one of the handlers in #apply
   * @param {Object} payload - action-specific data
   * @returns {Promise<boolean>} whether the request was applied/relayed
   */
  static async request(action, payload) {
    if (game.user.isGM) {
      await CPRNetSocket.#apply({ action, payload });
      return true;
    }
    if (!CPRNetSocket.requireActiveGM()) return false;
    game.socket.emit(`system.${game.system.id}`, { action, payload });
    return true;
  }

  /**
   * Apply a mutation on the GM client.
   *
   * @param {Object} message - { action, payload }
   */
  static async #apply({ action, payload }) {
    switch (action) {
      // Update any document by UUID (AP actor, embedded program, floor state, token, ...).
      case "update": {
        const doc = await fromUuid(payload.uuid);
        if (doc) await doc.update(payload.data);
        break;
      }
      // Grant/restore a user's ownership level on a document (Control-node devices).
      case "ownership": {
        const doc = await fromUuid(payload.uuid);
        if (doc) {
          await doc.update({ [`ownership.${payload.userId}`]: payload.level });
        }
        break;
      }
      default:
        LOGGER.warn(`CPRNetSocket | unknown action "${action}"`);
        break;
    }
  }
}
