import CPRHuman from "./cpr-human.js";

/**
 * The mook actor extends CPRActor since there is a lot of overlap behind the scenes with the
 * way items interact and how stats and skills are used.
 *
 * @extends {CPRHuman}
 */
export default class CPRMookActor extends CPRHuman {
  /**
   * Set sensible token defaults on a newly-created mook: vision and an HP resource bar. Mooks keep a
   * neutral disposition and unlinked tokens. Applied only to a genuinely-new actor. Core-item
   * population lives on the CPRActor base.
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
          sight: { enabled: true },
          bar1: { attribute: "derivedStats.hp" },
        },
      });
    }
    return allowed;
  }
}
