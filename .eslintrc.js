module.exports = {
  extends: ["@thesis-co"],
  globals: {
    document: "readonly",
    window: "readonly",
  },
  rules: {
    // FIXME Disabled to get an initial lint pass in, but needs to be
    // FIXME reenabled.
    "react/no-unstable-nested-components": [0],
    // TypeScript allows us to declare props that are non-optional internally
    // but are interpreted as optional externally if they have defaultProps
    // defined; the following two adjustments disable eslint-plugin-react
    // checks that predate this ability for TS and that no longer apply.
    "react/default-props-match-prop-types": [
      2,
      { allowRequiredDefaults: true },
    ],
    "react/require-default-props": [0],
    // Styled-jsx does not play nice with this rule, unfortunately.
    "react/jsx-one-expression-per-line": [0],
    // stlyed-jsx also uses a couple of not-known-by-default properties.
    "react/no-unknown-property": [2, { ignore: ["jsx", "global"] }],
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
    // "no-console": ["error"],
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
    "!.github",
    "size-plugin.json",
  ],
}
