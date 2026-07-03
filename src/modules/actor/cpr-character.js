import CPRHuman from "./cpr-human.js";

/**
 * Character actors are generally represented by players, but for especially detailed NPCs,
 * they are appropriate too. Characters are the most complex actors in the system.
 *
 * @extends {CPRHuman}
 */
export default class CPRCharacterActor extends CPRHuman {
  /**
   * Set sensible token defaults on a newly-created character: linked token, friendly disposition,
   * vision, and an HP resource bar. Applied only to a genuinely-new actor (a duplicate/import keeps its
   * own token). Core-item population lives on the CPRActor base.
   *
   * @async
   * @override
   * @param {object} data - the creation data
   * @param {object} options - creation options
   * @param {User} user - the user requesting the creation
   * @returns {Promise<boolean|void>} false aborts creation
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (!data.items?.length) {
      this.updateSource({
        prototypeToken: {
          actorLink: true,
          disposition: 1,
          sight: { enabled: true },
          bar1: { attribute: "stats.hp" },
        },
      });
    }
    return allowed;
  }
}
