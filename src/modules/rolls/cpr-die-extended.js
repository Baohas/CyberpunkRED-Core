const { Die, DiceTerm } = foundry.dice.terms;

/**
 * Extended Die that adds two Cyberpunk RED modifiers to Foundry's dice pipeline:
 *
 * - `red` — the check-die critical. A natural **max** face explodes (adds one die, **once**, no
 *   cascading); a natural **1** implodes (adds one die counted **negatively**, once). An optional
 *   threshold (`redN`) lowers the explode trigger to `>= N` (RAW default = the die's max face). `red`
 *   **supersedes** Foundry's explode: any `x`/`xo` on the same term is stripped (see the constructor).
 *   Notation: `1d10red`, `1d10red+8`, `1d6red`, `1d10red5`.
 *
 * - `dmg` — a **non-mutating marker** that (a) flags the term as a *damage roll* (so the system renders
 *   the damage card with its apply-damage icon) and (b) flags a *critical* by counting qualifying dice,
 *   **without** adding/removing dice or changing the total. Trigger params follow core `explode`'s
 *   grammar — `dmg(count)(op)(threshold)` — with the "lone number = threshold" rule. RAW default is
 *   `2×MAX`: `count = 2`, `op = ">="`, `threshold = faces`. `count 0` (`dmg0` / `dmg0>=6`) is the
 *   "no crit" sentinel: still a damage roll, but it never crits. Notation: `2d6dmg`, `2d6dmg5`,
 *   `4d6dmg3>=5`, `4d10dmg2>=9`, `2d6dmg0`.
 *
 * Both are registered as first-class entries in {@link MODIFIERS} so Foundry's normal modifier pipeline
 * dispatches them in formula order — no `_evaluateModifiers` override.
 *
 * @extends {Die}
 */
export default class CPRDie extends Die {
  /**
   * Register the CPR modifiers alongside the core set.
   * @type {Record<string, string>}
   * @override
   */
  static MODIFIERS = {
    ...Die.MODIFIERS,
    red: "red",
    dmg: "dmg",
  };

  /**
   * Note whether this term carries `red`. Foundry can fuse adjacent letter-modifiers into one token
   * (`1d10xred` → `["xred"]`, split only at evaluation), so we detect `red` on the joined modifier
   * string rather than per token. Used to make `explode`/`explodeOnce` no-ops — `red` supersedes them.
   *
   * @param {object} termData - Die term data (see {@link DiceTerm}).
   */
  constructor(termData = {}) {
    super(termData);
    this._cprHasRed =
      Array.isArray(this.modifiers) && /red/i.test(this.modifiers.join(""));
  }

  /**
   * `red` supersedes Foundry's explode: when the term also carries `red`, `x` does nothing (order in
   * the formula is irrelevant) so a max face never produces both an `x` explosion and a `red` bonus die.
   *
   * @param {string} modifier - The matched modifier query.
   * @param {object} [options] - Explode options.
   * @returns {Promise<false|void>}
   * @override
   */
  async explode(modifier, options) {
    if (this._cprHasRed) return undefined;
    return super.explode(modifier, options);
  }

  /** @override - see {@link explode}; `red` supersedes `xo` too. */
  async explodeOnce(modifier) {
    if (this._cprHasRed) return undefined;
    return super.explodeOnce(modifier);
  }

  /**
   * `red`'s bonus/penalty dice are not themselves rerollable (confirmed CPR behaviour). When `reroll`
   * runs after `red` (e.g. `1d10redr1`), temporarily hide the `red`-added dice — `reroll` skips inactive
   * results — then restore them. `rerollRecursive` routes through here via its own `this.reroll(...)`.
   *
   * @param {string} modifier - The matched modifier query.
   * @param {object} [options] - Reroll options (e.g. `{ recursive: true }`).
   * @returns {Promise<false|void>}
   * @override
   */
  async reroll(modifier, options) {
    const exempt = this.results.filter((r) => r.cprBonus && r.active);
    exempt.forEach((r) => {
      r.active = false;
    });
    try {
      return await super.reroll(modifier, options);
    } finally {
      exempt.forEach((r) => {
        r.active = true;
      });
    }
  }

  /**
   * The `red` check-die critical: explode on max (`>= threshold`), implode on a natural 1. One extra
   * die per qualifying original result, no cascading.
   *
   * @param {string} modifier - The matched modifier query (e.g. `red`, `red5`).
   * @returns {Promise<false|void>} False if the modifier was unmatched.
   */
  async red(modifier) {
    const match = modifier.match(/red([0-9]+)?/i);
    if (!match) return false;
    const [rawThreshold] = match.slice(1);
    const threshold = Number.isNumeric(rawThreshold)
      ? parseInt(rawThreshold, 10)
      : this.faces;

    // Snapshot the active, unprocessed results so the dice we add below are not themselves processed.
    const targets = this.results.filter((r) => r.active && !r.cprProcessed);
    for (const result of targets) {
      result.cprProcessed = true;
      if (result.result >= threshold) {
        // Critical success — explode: add one die, summed into the total normally.
        result.exploded = true;
        // eslint-disable-next-line no-await-in-loop
        const bonus = await this.roll();
        bonus.cprProcessed = true;
        bonus.cprBonus = true;
        bonus.cprSuccess = true;
      } else if (result.result === 1) {
        // Critical failure — implode: add one die counted negatively (subtracted from the total).
        // eslint-disable-next-line no-await-in-loop
        const penalty = await this.roll();
        penalty.cprProcessed = true;
        penalty.cprBonus = true;
        penalty.cprFailure = true;
        penalty.count = -1 * penalty.result;
      }
    }
    return undefined;
  }

  /**
   * The `dmg` damage marker: flag the term as a damage roll and detect a critical by counting
   * qualifying dice. Pure inspection — never changes the dice pool or the total.
   *
   * @param {string} modifier - The matched modifier query (e.g. `dmg`, `dmg5`, `dmg3>=5`, `dmg0`).
   * @returns {false|void} False if the modifier was unmatched.
   */
  dmg(modifier) {
    const match = modifier.match(/dmg([0-9]+)?([<>=]+)?([0-9]+)?/i);
    if (!match) return false;
    const [n1, rawOp, n2] = match.slice(1);

    let count;
    let threshold;
    if (n1 === "0") {
      // Count-0 sentinel: a damage roll that never crits.
      count = 0;
      threshold = Number.isNumeric(n2) ? parseInt(n2, 10) : this.faces;
    } else if (n1 && !rawOp && !n2) {
      // A lone number with no comparison is the threshold (e.g. dmg5 → 5s count).
      count = 2;
      threshold = parseInt(n1, 10);
    } else {
      count = Number.isNumeric(n1) ? parseInt(n1, 10) : 2;
      threshold = Number.isNumeric(n2) ? parseInt(n2, 10) : this.faces;
    }
    const op = rawOp || ">=";

    // Mark this as a damage roll regardless of the crit outcome (drives the damage card + apply icon).
    this.options.cprDamage = true;
    this.options.cprDamageCrit = { count, op, threshold };

    const qualifying = this.results.filter(
      (r) => r.active && DiceTerm.compareResult(r.result, op, threshold),
    );
    const isCrit = count > 0 && qualifying.length >= count;
    this.options.cprDamageIsCrit = isCrit;
    if (isCrit) {
      for (const r of qualifying) r.cprDamageCrit = true;
    }
    return undefined;
  }

  /**
   * Style the dice that `red` added: a critical-success bonus die as a green `+N`, a critical-failure
   * penalty die as a red negative value. All other dice fall back to the core label.
   *
   * @param {DiceTermResult} result - A single rolled result.
   * @returns {string}
   * @override
   */
  getResultLabel(result) {
    if (result.cprFailure) {
      return `<span class="cpr-crit-failure" title="Critical Failure!">${result.count}</span>`;
    }
    if (result.cprSuccess) {
      return `<span class="cpr-crit-success" title="Critical Success!">+${result.result}</span>`;
    }
    return super.getResultLabel(result);
  }
}
