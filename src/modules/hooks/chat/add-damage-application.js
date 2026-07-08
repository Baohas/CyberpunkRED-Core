import SystemUtils from "../../utils/cpr-systemUtils.js";

/*
 * A native roll made with the `dmg` die modifier (e.g. `/r 2d6dmg`) is a plain Foundry roll — it carries
 * the CPR damage flags on its die term (`options.cprDamage` / `cprDamageIsCrit`, set by CPRDie#dmg) but
 * none of the bespoke weapon-damage card, so on its own it renders without any way to apply the damage.
 * This hook injects the apply-damage affordance onto exactly those messages: a bolt that reuses the same
 * `applyDamage` chat action as the weapon card (wired by add-glyphs' chatListeners) and, on a crit, the
 * RAW +5 bonus fed to `_applyDamage`. Weapon/program damage cards already render their own apply-damage
 * button, so they are skipped (see the guard) to avoid a duplicate.
 */

// RAW critical damage bonus. The `dmg` marker is non-mutating (it never changes the roll total), so the
// crit's extra damage is applied here, mirroring CPRDamageRoll's `bonusDamage` default.
const CRIT_BONUS = 5;

const AddDamageApplication = () => {
  Hooks.on("renderChatMessageHTML", async (message, htmlElement) => {
    // Only native rolls flagged by the `dmg` modifier. `message.rolls` survives serialisation, so this
    // fires the same on the rolling client and on clients that reconstruct the message.
    const dmgDie = (message?.rolls ?? [])
      .flatMap((roll) => roll.dice ?? [])
      .find((die) => die?.options?.cprDamage === true);
    if (!dmgDie) return;

    const html = $(htmlElement); // TODO: Remove JQuery.
    // Skip messages that already carry an apply-damage button — i.e. the bespoke weapon/program damage
    // card, whose roll also carries the `dmg` marker. Only the bare native roll needs one injected.
    if (html.find('[data-action="applyDamage"]').length) return;

    const roll = message.rolls.find((r) =>
      (r.dice ?? []).some((die) => die?.options?.cprDamage === true),
    );
    const isCrit = dmgDie.options.cprDamageIsCrit === true;
    const bonusDamage = isCrit ? CRIT_BONUS : 0;

    const applyTooltip = SystemUtils.Localize(
      "CPR.chat.damageApplication.applyDamageSelected",
    );
    const critLabel = isCrit
      ? `<span class="cpr-native-damage-crit">${SystemUtils.Localize(
          "CPR.chat.damageApplication.criticalDamage",
        )} ${CRIT_BONUS}</span>`
      : "";

    // scope=global → apply to the clicking user's selected/targeted tokens, resolved at click time by
    // CPRChat.damageApplication. location=body / lethal=true are the RAW defaults for an unqualified roll;
    // ablation/ammo data are absent (a bare roll has no weapon), which damageApplication reads as zero.
    const block = $(
      `<div class="cpr-native-damage">
        <a class="clickable" data-action="applyDamage" data-scope="global"
           data-total-damage="${roll.total}" data-bonus-damage="${bonusDamage}"
           data-damage-location="body" data-damage-lethal="true">
          <i class="fas fa-bolt" data-tooltip="${applyTooltip}"></i>
          <span>${SystemUtils.Localize("CPR.global.generic.damage")}</span>
        </a>
        ${critLabel}
      </div>`,
    );

    const content = html.find(".message-content");
    (content.length ? content : html).append(block);
  });
};

export default AddDamageApplication;
