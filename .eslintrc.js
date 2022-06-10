// This is a non-ESM JS file, so this rule can't be followed.
/* eslint-disable @typescript-eslint/no-var-requires */
const {
  rules: {
    "@typescript-eslint/naming-convention":
      airbnbTypeScriptNamingConventionRules,
  },
} = require("eslint-config-airbnb-typescript/lib/shared")

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
  plugins: ["no-only-tests"],
  globals: {
    document: "readonly",
    window: "readonly",
  },
  rules: {
    // Styled-jsx does not play nice with this rule, unfortunately.
    "react/jsx-one-expression-per-line": [0],
    // JSX for the extension is explicitly rejected by Dan Abramov with good
    // reasoning @
    // https://github.com/airbnb/javascript/pull/985#issuecomment-239145468 .
    // The rule is also mostly irrelevant to this codebase due to TypeScript
    // usage (where .tsx is required).
    "react/jsx-filename-extension": [0],
    "@typescript-eslint/naming-convention": [
      ...airbnbTypeScriptNamingConventionRules,
      // Allow underscore-only identifiers to indicate ignored positional variables.
      {
        selector: "variable",
        format: null,
        filter: {
          regex: "^_+$",
          match: true,
        },
        custom: {
          regex: "^_+$",
          match: true,
        },
      },
    ],
    // TypeScript allows us to declare props that are non-optional internally
    // but are interpreted as optional externally if they have defaultProps
    // defined; the following two adjustments disable eslint-plugin-react
    // checks that predate this ability for TS and that no longer apply.
    "react/default-props-match-prop-types": [
      2,
      { allowRequiredDefaults: true },
    ],
    "react/require-default-props": [0],
    // Shared components may have labels associated externally in a way ESLint
    // does not detect.
    "jsx-a11y/label-has-associated-control": [
      2,
      {
        controlComponents: ["SharedAssetInput"],
      },
    ],
    // Console usage should use background/lib/logger.ts, which allows users to
    // share logs with devs if desired.
    "no-console": ["error"],
    // Don't slap build files for importing devDependencies.
    "import/no-extraneous-dependencies": [
      "error",
      { devDependencies: ["!+(src/api|ui)/**/*.+(ts|js)"] },
    ],
    // dissalow it.only, assert.only, etc..
    "no-only-tests/no-only-tests": ["error"],
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
    "@typescript-eslint/no-unused-vars": "error",
    "no-unused-vars": "off",
  },
  ignorePatterns: [
    "dist/",
    "extension-reload.js",
    "**/validate/*.js",
    "**/local-chain/**",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./.tsconfig-eslint.json",
  },
}
