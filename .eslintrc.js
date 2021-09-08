// This is a JS file, so this rule can't be followed.
/* eslint-disable @typescript-eslint/no-var-requires */
const {
  rules: { "no-param-reassign": airbnbNoParamReassignRules },
} = require("eslint-config-airbnb-base/rules/best-practices")
/* eslint-enable @typescript-eslint/no-var-requires */

module.exports = {
  extends: [
    "airbnb",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  globals: {
    document: "readonly",
    window: "readonly",
  },
  rules: {
    "react/jsx-one-expression-per-line": [0],
    "react/jsx-filename-extension": [0],
    "jsx-a11y/label-has-associated-control": [
      2,
      {
        controlComponents: ["SharedAssetInput"],
      },
    ],
    "import/no-extraneous-dependencies": [
      "error",
      // Don't slap build files for importing devDependencies.
      { devDependencies: ["!+(src/api|ui)/**/*.+(ts|js)"] },
    ],
    "import/extensions": [
      "error",
      {
        // Never flag missing .ts import extensions, as these are resolved at build time.
        ts: "never",
      },
    ],
    // Add known-safe exceptions to no-param-reassign.
    "no-param-reassign": [
      airbnbNoParamReassignRules[0],
      {
        props: airbnbNoParamReassignRules[1].props,
        ignorePropertyModificationsFor:
          airbnbNoParamReassignRules[1].ignorePropertyModificationsFor,
        ignorePropertyModificationsForRegex: [
          ...(airbnbNoParamReassignRules[1]
            .ignorePropertyModificationsForRegex || []),
          "^immer", // For redux-toolkit reducers using immer.
        ],
      },
    ],
    // Replace a couple of base ESLint rules defined by airbnb with TypeScript
    // extensions that understand certain TypeScript-specific features.
    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": ["error"],
    "no-useless-constructor": "off",
    "@typescript-eslint/no-useless-constructor": ["error"],
    // TypeScript enums trigger a false positive when using no-shadow, we have to use a typescript specific rule instead
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": "error",
  },
  ignorePatterns: ["dist/", "extension-reload.js"],
  parser: "@typescript-eslint/parser",
}
