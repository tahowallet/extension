module.exports = {
  extends: ["@thesis-co"],
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
  },
  ignorePatterns: [
    "dist/",
    "extension-reload.js",
    "**/validate/*.js",
    "**/local-chain/**",
  ],
}
