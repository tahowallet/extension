const path = require("path")

module.exports = {
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["!**/*.+(ts|js)", "**/*.test.ts"],
        packageDir: [__dirname, path.resolve(__dirname, "../")],
      },
    ],
  },
}
