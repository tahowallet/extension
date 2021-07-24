module.exports = {
  extends: [
    "airbnb",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  globals: {
    browser: "readonly",
    document: "readonly",
  },
  rules: {
    "react/jsx-one-expression-per-line": [0],
    "react/jsx-filename-extension": [0],
    "import/no-extraneous-dependencies": [
      "error",
      // Don't slap build files for importing devDependencies.
      { devDependencies: ["!+(src/api|ui)/**/*.+(ts|js)"] },
    ],
  },
  ignorePatterns: "dist/",
  parser: "@typescript-eslint/parser",
}
