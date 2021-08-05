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
        ts: "never",
      },
    ],
    // Replace a couple of base ESLint rules defined by airbnb with TypeScript
    // extensions that understand certain TypeScript-specific features.
    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": ["error"],
    "no-useless-constructor": "off",
    "@typescript-eslint/no-useless-constructor": ["error"],
  },
  ignorePatterns: ["dist/", "extension-reload.js"],
  parser: "@typescript-eslint/parser",
}
