import js from "@eslint/js";
import globals from "globals";
import importX from "eslint-plugin-import-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  {
    plugins: {
      // Registered under the legacy "import" namespace so existing rule names
      // and inline `eslint-disable import/*` directives keep working.
      import: importX,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        // Foundry VTT globals
        $: "readonly",
        ActiveEffect: "readonly",
        ActiveEffectConfig: "readonly",
        Actor: "readonly",
        Actors: "readonly",
        ActorSheet: "readonly",
        Babele: "readonly",
        CONFIG: "readonly",
        CONST: "readonly",
        ChatMessage: "readonly",
        Combat: "readonly",
        Combatant: "readonly",
        ContextMenu: "readonly",
        Dialog: "readonly",
        DocumentSheetConfig: "readonly",
        Folder: "readonly",
        FormApplication: "readonly",
        FormDataExtended: "readonly",
        Handlebars: "readonly",
        Hooks: "readonly",
        ImagePopout: "readonly",
        Item: "readonly",
        Items: "readonly",
        ItemSheet: "readonly",
        Macro: "readonly",
        Roll: "readonly",
        Ruler: "readonly",
        Scene: "readonly",
        TextEditor: "readonly",
        TokenDocument: "readonly",
        canvas: "readonly",
        dragRuler: "readonly",
        duplicate: "readonly",
        foundry: "readonly",
        fromUuid: "readonly",
        fromUuidSync: "readonly",
        game: "readonly",
        getProperty: "readonly",
        hasProperty: "readonly",
        isNewerVersion: "readonly",
        loadTemplates: "readonly",
        mergeObject: "readonly",
        parseUuid: "readonly",
        randomID: "readonly",
        renderTemplate: "readonly",
        saveDataToFile: "readonly",
        setProperty: "readonly",
        ui: "readonly",
      },
    },
    settings: {
      "import/extensions": [".js"],
    },
    linterOptions: {
      // eslint 8's .eslintrc setup did not report unused disable directives by
      // default. The codebase has many inline disables for former airbnb rules;
      // keep the prior behavior rather than flag them all as unused.
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "no-warning-comments": ["warn", { terms: ["TODO"] }],
      "no-useless-assignment": "error",
      "import/no-cycle": ["warn"],
      "import/no-unresolved": ["error", { ignore: [".*devMode\\.js$"] }],
      "no-underscore-dangle": "off",
      "no-param-reassign": ["error"],
      "class-methods-use-this": ["warn"],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-nested-ternary": "off",
      "no-restricted-syntax": [
        "warn",
        {
          selector: "ForInStatement",
          message:
            "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.",
        },
        {
          selector: "LabeledStatement",
          message:
            "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.",
        },
        {
          selector: "WithStatement",
          message:
            "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
        },
      ],
      "import/extensions": ["warn", "always"],
    },
  },
  prettierRecommended,
];
