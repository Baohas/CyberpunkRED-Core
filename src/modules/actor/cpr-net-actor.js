import CPRChat from "../chat/cpr-chat.js";

/**
 * Shared base for the deprecated NET-entity actors (Black ICE and Demon). Unlike the other actor
 * types these extend Foundry's `Actor` directly rather than `CPRActor`, track REZ in place of HP, and
 * share their creation, REZ-damage, and stat-lookup behaviour; each subclass adds its own roll
 * construction. (These types are slated to move to Program items in the Netrunning work.)
 *
 * @extends {Actor}
 */
export default class CPRNetActor extends Actor {
  /**
   * Set the REZ stat as the token's resource bar on a newly-created NET actor (REZ behaves much like
   * HP). Applied only to a genuinely-new actor (a duplicate/import keeps its own token).
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
        prototypeToken: { bar1: { attribute: "stats.rez" } },
      });
    }
    return allowed;
  }

  /**
   * Apply damage to the REZ. NET entities have no armor and take no crit damage, so the damage is
   * simply subtracted from REZ.
   *
   * @param {int} damage - direct damage dealt
   */
  async _applyDamage(damage) {
    const currentRez = this.system.stats.rez.value;
    await this.update({
      "system.stats.rez.value": currentRez - damage,
    });
    CPRChat.RenderDamageApplicationCard({
      actor: this,
      hpReduction: damage,
      rezReduction: true,
    });
  }

  /**
   * Reverse REZ damage, in case someone made a mistake applying it.
   *
   * @param {int} rezReduction - value of the damage taken
   */
  async _reverseDamage(rezReduction) {
    const currentRez = this.system.stats.rez.value;
    const updatedRez = Math.min(
      currentRez + rezReduction,
      this.system.stats.rez.max,
    );
    await this.update({ "system.stats.rez.value": updatedRez });
  }

  /**
   * Given a stat name, return the value of it off the actor.
   *
   * @param {String} statName - name of the stat to retrieve
   * @returns {Number}
   */
  getStat(statName) {
    const statValue =
      statName === "rez"
        ? this.system.stats[statName].value
        : this.system.stats[statName];
    return parseInt(statValue, 10);
  }
}
