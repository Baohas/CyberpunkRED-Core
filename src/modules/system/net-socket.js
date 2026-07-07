import LOGGER from "../utils/cpr-logger.js";
import SystemUtils from "../utils/cpr-systemUtils.js";

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
      // Run the GM-side Scanner reveal (a player cannot open the GM dialog or flag GM-owned tokens).
      case "scannerReveal":
        await CPRNetSocket.#scannerReveal(
          payload.meatTokenId,
          payload.rollTotal,
        );
        break;
      default:
        LOGGER.warn(`CPRNetSocket | unknown action "${action}"`);
        break;
    }
  }

  /**
   * GM-side Scanner reveal: present the hidden, not-yet-located access points the scan may have
   * found, then flag each chosen token located (`flags.<system>.netrunning.revealed`) and ping it
   * (a shared ping visible to everyone). The tokens stay hidden on the canvas.
   *
   * @param {String} meatTokenId - the scanning runner's token id (for distance annotation)
   * @param {Number} rollTotal - the Scanner roll total (shown to the GM)
   */
  static async #scannerReveal(meatTokenId, rollTotal) {
    const meatToken = canvas.tokens.get(meatTokenId);
    const candidates = canvas.tokens.placeables
      .filter(
        (t) =>
          t.actor?.type === "accessPoint" &&
          t.document.hidden &&
          !t.document.getFlag(game.system.id, "netrunning")?.revealed,
      )
      .map((t) => ({
        token: t,
        distance: meatToken
          ? canvas.grid.measurePath([meatToken.center, t.center]).distance
          : null,
        arch: t.actor.installedNetarch?.name ?? "—",
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    // Nothing new to locate — the already-located ones were pinged by the caller.
    if (!candidates.length) return;
    const rows = candidates
      .map((entry) => {
        const dist =
          entry.distance != null ? ` — ${entry.distance.toFixed(1)}m` : "";
        return `<label class="flexrow"><input type="checkbox" name="ap" value="${entry.token.id}" checked/> ${entry.arch}${dist}</label>`;
      })
      .join("");
    const content = `<p>${SystemUtils.Format("CPR.netArchitecture.app.scannerRevealHint", { total: rollTotal })}</p>${rows}`;
    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: SystemUtils.Localize("CPR.netArchitecture.app.scannerReveal"),
      },
      content,
      buttons: [
        {
          action: "reveal",
          label: SystemUtils.Localize("CPR.netArchitecture.app.scannerReveal"),
          default: true,
          callback: (event, button) =>
            Array.from(
              button.form.querySelectorAll('input[name="ap"]:checked'),
            ).map((input) => input.value),
        },
      ],
    }).catch(() => null);
    if (!result?.length) return;
    // Flag each located access point as found by the runner, then ping it (broadcast to everyone).
    for (const tokenId of result) {
      const entry = candidates.find((e) => e.token.id === tokenId);
      if (!entry) continue;
      // eslint-disable-next-line no-await-in-loop
      await entry.token.document.setFlag(game.system.id, "netrunning", {
        revealed: true,
      });
      canvas.ping(entry.token.center);
    }
  }
}
