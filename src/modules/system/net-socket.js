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
   * Request a shared-state mutation. Applied directly if the caller is a GM, otherwise relayed to
   * the primary GM. Returns before the GM has applied it (fire-and-forget) for the player path.
   *
   * @param {String} action - one of the handlers in #apply
   * @param {Object} payload - action-specific data
   */
  static async request(action, payload) {
    if (game.user.isGM) return CPRNetSocket.#apply({ action, payload });
    game.socket.emit(`system.${game.system.id}`, { action, payload });
    return undefined;
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
