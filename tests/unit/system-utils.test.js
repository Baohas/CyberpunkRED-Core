import { describe, it, expect } from "vitest";

import SystemUtils from "../../src/modules/utils/cpr-systemUtils.js";

/**
 * Tier-2 examples: `cpr-systemUtils.js` imports only the logger and touches no
 * Foundry globals at import time, so it loads under the setup shim. `slugify` is
 * pure logic; `Localize`/`Format` delegate to the stubbed `game.i18n`.
 */
describe("CPRSystemUtils.slugify", () => {
  it("removes spaces and lower-cases the first character", () => {
    expect(SystemUtils.slugify("First Aid")).toBe("firstAid");
  });

  it("joins a '/' skill name with 'And'", () => {
    expect(SystemUtils.slugify("Evasion/Dance")).toBe("evasionAndDance");
  });

  it("joins an '&' skill name with 'And'", () => {
    expect(SystemUtils.slugify("Composition & Education")).toBe(
      "compositionAndEducation",
    );
  });

  it("uses the 'Or' form for the special-cased '/' skills", () => {
    // Resist Torture/Drugs is one of the explicit "Or" special cases.
    expect(SystemUtils.slugify("Resist Torture/Drugs")).toBe(
      "resistTortureOrDrugs",
    );
  });
});

describe("CPRSystemUtils.Localize / Format", () => {
  it("Localize delegates to game.i18n.localize", () => {
    // The shim echoes the key back.
    expect(SystemUtils.Localize("CPR.global.stats.body")).toBe(
      "CPR.global.stats.body",
    );
  });

  it("Format substitutes {placeholders} from the data object", () => {
    expect(SystemUtils.Format("Applied {amount} damage", { amount: 10 })).toBe(
      "Applied 10 damage",
    );
  });
});

describe("CPRSystemUtils source formatting", () => {
  // page: 0 entries format to the bare book name, so the shim yields distinct,
  // assertable strings without resolving the "…entry.source" template.
  const core = { book: "Core", page: 0 };
  const chrome = { book: "Black Chrome", page: 0 };
  const iface = { book: "Interface RED", page: 0 };

  describe("FormatSourceList", () => {
    it("returns one formatted citation per book-having entry", () => {
      expect(SystemUtils.FormatSourceList([core, chrome])).toEqual([
        "Core",
        "Black Chrome",
      ]);
    });

    it("drops entries without a book and yields [] for empty/undefined", () => {
      expect(
        SystemUtils.FormatSourceList([{ book: "", page: 5 }, chrome]),
      ).toEqual(["Black Chrome"]);
      expect(SystemUtils.FormatSourceList([])).toEqual([]);
      expect(SystemUtils.FormatSourceList()).toEqual([]);
    });

    it("uses the page citation for entries with a page", () => {
      expect(SystemUtils.FormatSourceList([{ book: "Core", page: 5 }])).toEqual(
        [
          SystemUtils.Format("CPR.browser.entry.source", {
            book: "Core",
            page: 5,
          }),
        ],
      );
    });
  });

  describe("FormatSources", () => {
    it("comma-joins every book-having citation", () => {
      expect(SystemUtils.FormatSources([core, chrome, iface])).toBe(
        "Core, Black Chrome, Interface RED",
      );
    });

    it("yields '' for empty/undefined", () => {
      expect(SystemUtils.FormatSources([])).toBe("");
      expect(SystemUtils.FormatSources()).toBe("");
    });
  });

  describe("FormatSourceDisplay", () => {
    it("shows the first source and hides the rest, one per <br> line", () => {
      expect(SystemUtils.FormatSourceDisplay([core, chrome, iface])).toEqual({
        source: "Core",
        sourceTooltip: "Black Chrome<br>Interface RED",
      });
    });

    it("gives a single source no tooltip", () => {
      expect(SystemUtils.FormatSourceDisplay([core])).toEqual({
        source: "Core",
        sourceTooltip: "",
      });
    });

    it("gives an empty/undefined list a blank display", () => {
      expect(SystemUtils.FormatSourceDisplay([])).toEqual({
        source: "",
        sourceTooltip: "",
      });
      expect(SystemUtils.FormatSourceDisplay()).toEqual({
        source: "",
        sourceTooltip: "",
      });
    });

    it("ignores blank entries when choosing the first source", () => {
      expect(
        SystemUtils.FormatSourceDisplay([{ book: "", page: 0 }, core, chrome]),
      ).toEqual({ source: "Core", sourceTooltip: "Black Chrome" });
    });
  });
});
