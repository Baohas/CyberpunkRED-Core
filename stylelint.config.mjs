/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["define-mixin", "mixin"],
      },
    ],
    // Disallow color definitions outside of variables.css
    "color-named": "never",
    // Disallow color definitions outside of variables.css
    "color-no-hex": true,
    "declaration-block-no-redundant-longhand-properties": null,
    // Disallow color definitions outside of variables.css
    "function-disallowed-list": [
      "rgb",
      "rgba",
      "hsl",
      "hsla",
      "hwb",
      "lab",
      "lch",
      "oklab",
      "oklch",
      "color",
    ],
    "nesting-selector-no-missing-scoping-root": [
      true,
      {
        ignoreAtRules: ["define-mixin"],
      },
    ],
    "no-descending-specificity": null,
    "selector-class-pattern": null,
    // Disallow absolute length units
    "unit-disallowed-list": ["cm", "mm", "Q", "in", "pc", "pt", "px"],
  },
  overrides: [
    {
      // Allow colors only in variables.css
      files: ["src/css/variables.css"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
