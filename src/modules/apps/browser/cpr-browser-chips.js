import CPR from "../../system/config.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";

/*
 * Stat "chips" shown on a browser result card: the key stats each item type
 * surfaces on its sheet, as short localized strings (e.g. "ROF 1", "SP 11",
 * "Foundational"). Breadcrumb facts (sub-type, brand) and price/source are
 * rendered elsewhere, so they're omitted here.
 */

/*
 * Full localization keys for every chip. They are spelled out as literals here
 * (rather than composed from a namespace + suffix) so the unused-string CI
 * check — which greps src for each key verbatim — can see them. The builders
 * below reference them symbolically (CHIP.rof, …), keeping each call readable.
 */
const CHIP = {
  rof: "CPR.browser.chip.rof",
  suppressiveFire: "CPR.browser.chip.suppressiveFire",
  autofire: "CPR.browser.chip.autofire",
  damage: "CPR.browser.chip.damage",
  magazine: "CPR.browser.chip.magazine",
  hands: "CPR.browser.chip.hands",
  concealable: "CPR.browser.chip.concealable",
  sp: "CPR.browser.chip.sp",
  hp: "CPR.browser.chip.hp",
  penalty: "CPR.browser.chip.penalty",
  foundational: "CPR.browser.chip.foundational",
  slots: "CPR.browser.chip.slots",
  humanityLoss: "CPR.browser.chip.humanityLoss",
  quantity: "CPR.browser.chip.quantity",
  atk: "CPR.browser.chip.atk",
  def: "CPR.browser.chip.def",
  rez: "CPR.browser.chip.rez",
  per: "CPR.browser.chip.per",
  spd: "CPR.browser.chip.spd",
  floors: "CPR.browser.chip.floors",
  sdp: "CPR.browser.chip.sdp",
  seats: "CPR.browser.chip.seats",
  speed: "CPR.browser.chip.speed",
};

// A chip with a substituted value, e.g. "ROF 1" from "ROF {value}".
const valued = (key, value) => SystemUtils.Format(key, { value });

/*
 * The builders below stay declarative — one line per stat — by composing these
 * helpers, each of which returns a finished chip string or null when the stat
 * doesn't apply. The caller drops the nulls.
 */

// A bare flag chip (e.g. "Concealable"), only when `on` is truthy.
const flag = (key, on) => (on ? SystemUtils.Localize(key) : null);

// A numeric chip shown whenever the value is a number (including 0).
const number = (key, value) =>
  typeof value === "number" ? valued(key, value) : null;

// A numeric chip shown only when the value is greater than zero.
const positive = (key, value) => (value > 0 ? valued(key, value) : null);

// A chip shown only when the value is truthy (non-empty string / non-zero).
const present = (key, value) => (value ? valued(key, value) : null);

// A "×N" quantity chip, shown only for stacks of more than one.
const quantity = (amount) =>
  amount > 1 ? valued(CHIP.quantity, amount) : null;

// The localized label for an enum value (config map -> localization key).
const enumLabel = (map, value) => {
  const key = map?.[value];
  return key ? SystemUtils.Localize(key) : value || null;
};

// Armor's defence chip: a shield's HP, or the SP of the body/head locations it
// covers ("SP 11", or "SP 11/7" when they differ). Null for armor with neither.
const armorDefence = (system) => {
  if (system.isShield) return number(CHIP.hp, system.shieldHitPoints?.max);
  const body = system.isBodyLocation ? system.bodyLocation?.sp : undefined;
  const head = system.isHeadLocation ? system.headLocation?.sp : undefined;
  const values = [body, head].filter((sp) => typeof sp === "number");
  if (!values.length) return null;
  const allEqual = values.every((sp) => sp === values[0]);
  return valued(CHIP.sp, allEqual ? values[0] : values.join("/"));
};

// Cyberware's humanity-loss chip combining the rolled and static values as
// "1d6 / 3 HL", collapsing to whichever side is set. Null when neither is.
const humanityLoss = (system) => {
  const roll = system.humanityLoss?.roll;
  const fixed = system.humanityLoss?.static;
  const sides = [roll && roll !== "0" ? roll : null, fixed > 0 ? fixed : null];
  const parts = sides.filter((side) => side != null);
  return parts.length ? valued(CHIP.humanityLoss, parts.join(" / ")) : null;
};

/*
 * Per-type chip builders. Each takes an entry's `system` data and returns its
 * chips in display order; nulls (stats that don't apply) are dropped by the
 * caller. Types absent here (and the excluded skill/critical-injury/role) get
 * no chips.
 */
const CHIP_BUILDERS = {
  weapon: (s) => [
    positive(CHIP.rof, s.rof),
    flag(CHIP.suppressiveFire, s.fireModes?.suppressiveFire),
    positive(CHIP.autofire, s.fireModes?.autoFire),
    present(CHIP.damage, s.damage),
    positive(CHIP.magazine, s.magazine?.max),
    number(CHIP.hands, s.handsReq),
    flag(CHIP.concealable, s.concealable?.concealable),
  ],

  armor: (s) => [armorDefence(s), present(CHIP.penalty, s.penalty)],

  ammo: (s) => [enumLabel(CPR.ammoVarieties, s.variety), quantity(s.amount)],

  cyberware: (s) => [
    flag(CHIP.foundational, s.isFoundational),
    positive(CHIP.slots, s.installedItems?.slots),
    humanityLoss(s),
  ],

  clothing: (s) => [enumLabel(CPR.clothingVarieties, s.style)],

  gear: (s) => [quantity(s.amount)],

  drug: (s) => [quantity(s.amount)],

  cyberdeck: (s) => [positive(CHIP.slots, s.installedItems?.slots)],

  program: (s) => [
    positive(CHIP.atk, s.atk),
    positive(CHIP.def, s.def),
    positive(CHIP.rez, s.rez?.max),
    positive(CHIP.per, s.per),
    positive(CHIP.spd, s.spd),
  ],

  netarch: (s) => [positive(CHIP.floors, s.floors?.length)],

  vehicle: (s) => [
    number(CHIP.sdp, s.sdp),
    number(CHIP.seats, s.seats),
    number(CHIP.speed, s.speedCombat),
  ],
};

/**
 * Build the ordered list of stat chips for a browser entry. Types without a
 * builder (or with no notable stats) get none.
 *
 * @param {object} entry - a normalized browser index entry
 * @returns {Array<string>} the chip labels in display order (may be empty)
 */
export default function browserStatChips(entry) {
  const builder = CHIP_BUILDERS[entry.type];
  return builder ? builder(entry.system ?? {}).filter(Boolean) : [];
}
