// This is a JS file, so this rule can't be followed.
/* eslint-disable @typescript-eslint/no-var-requires */
const {
  rules: { "no-param-reassign": airbnbNoParamReassignRules },
} = require("eslint-config-airbnb-base/rules/best-practices")
/* eslint-enable @typescript-eslint/no-var-requires */

module.exports = {
  extends: [
    "airbnb",
    "airbnb-typescript",
    "airbnb/hooks",
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
  },
  ignorePatterns: ["dist/", "extension-reload.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./.tsconfig-eslint.json",
  },
}
