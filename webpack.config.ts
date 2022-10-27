import path from "path"
import webpack, {
  Configuration,
  DefinePlugin,
  WebpackOptionsNormalized,
  WebpackPluginInstance,
} from "webpack"
import { merge as webpackMerge } from "webpack-merge"
import Dotenv from "dotenv-webpack"
import SizePlugin from "size-plugin"
import TerserPlugin from "terser-webpack-plugin"
import LiveReloadPlugin from "webpack-livereload-plugin"
import CopyPlugin, { ObjectPattern } from "copy-webpack-plugin"
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin"
import WebExtensionArchivePlugin from "./build-utils/web-extension-archive-webpack-plugin"
import InjectWindowProvider from "./build-utils/inject-window-provider"
import "dotenv-defaults/config"

const supportedBrowsers = ["chrome"]

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
  devtool: "source-map",
  stats: "errors-only",
  entry: {
    popup: "./src/popup.ts",
    tab: "./src/tab.ts",
    background: "./src/background.ts",
    "background-ui": "./src/background-ui.ts",
    "window-provider": "./src/window-provider.ts",
    "provider-bridge": "./src/provider-bridge.ts",
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx)?$/,
        exclude: /node_modules(?!\/@tallyho)|webpack/,
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
            },
          },
        ],
      },
    ],
  },
  output: {
    // path: is set browser-specifically below
    filename: "[name].js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    fallback: {
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser"),
      // these are required for @tallyho/keyring-controller
      crypto: require.resolve("crypto-browserify"),
    },
  },
  plugins: [
    new InjectWindowProvider(),
    new Dotenv({
      defaults: true,
      systemvars: true,
      safe: true,
    }),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
        mode: "write-references",
      },
    }),
    // polyfill the process and Buffer APIs
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: ["process"],
    }),
    new SizePlugin({}),
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/@tallyho/tally-ui/public/",
        },
      ],
      // FIXME Forced cast below due to an incompatibility between the webpack
      // FIXME version refed in @types/copy-webpack-plugin and our local
      // FIXME webpack version.
    }) as unknown as WebpackPluginInstance,
    new DefinePlugin({
      "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
    }),
  ],
  optimization: {
    splitChunks: { automaticNameDelimiter: "-" },
  },
}

// Configuration adjustments for specific build modes, customized by browser.
const modeConfigs: {
  [mode: string]: (browser: string) => Partial<Configuration>
} = {
  development: () => ({
    plugins: [
      new LiveReloadPlugin({}),
      new CopyPlugin({
        patterns: ["dev-utils/*.js"],
        // FIXME Forced cast below due to an incompatibility between the webpack
        // FIXME version refed in @types/copy-webpack-plugin and our local
        // FIXME webpack version.
      }) as unknown as WebpackPluginInstance,
      new CopyPlugin({
        patterns: [
          {
            from: "node_modules/@tallyho/tally-ui/public/",
            force: true,
            priority: 1,
            transform: (content, fileName) => {
              if (fileName.endsWith("popup.html")) {
                const port = process.env.REACT_DEVTOOLS_DEFAULT_PORT

                return content
                  .toString("utf8")
                  .replace(
                    "<!-- INSERT_REACT_DEV_TOOLS_HERE -->",
                    `<script src="http://localhost:${port}"></script>`
                  )
              }

              return content
            },
          },
        ],
        // FIXME Forced cast below due to an incompatibility between the webpack
        // FIXME version refed in @types/copy-webpack-plugin and our local
        // FIXME webpack version.
      }) as unknown as WebpackPluginInstance,
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            mangle: false,
            compress: false,
            output: {
              beautify: true,
              indent_level: 2, // eslint-disable-line camelcase
            },
          },
        }),
      ],
    },
  }),
  production: (browser) => ({
    // For some reason, every source map variant embeds absolute paths, and
    // Firefox reproducibility is required for Firefox add-on store submission.
    // As such, in production, no source maps for firefox for full
    // reproducibility.
    //
    // Ideally, we would figure out a way not to have absolute paths in source
    // maps.
    devtool: browser === "firefox" ? false : "source-map",
    plugins: [
      new WebExtensionArchivePlugin({
        filename: browser,
      }),
    ],
    optimization: {
      minimizer: [
        // Firefox imposes filesize limits in the add-on store, so Firefox
        // builds are mangled and compressed. In a perfect world, we would
        // never do this so that users can inspect the code running on their
        // system more easily.
        new TerserPlugin({
          terserOptions: {
            mangle: browser === "firefox",
            compress: browser === "firefox",
            output:
              browser === "firefox"
                ? undefined
                : {
                    beautify: true,
                    indent_level: 2, // eslint-disable-line camelcase
                  },
          },
        }),
      ],
    },
  }),
}

// One config per supported browser, adjusted by mode.
export default (
  _: unknown,
  { mode }: WebpackOptionsNormalized
): webpack.Configuration[] =>
  supportedBrowsers.map((browser) => {
    const distPath = path.join(__dirname, "dist", browser)

    // Try to find a build mode config adjustment and call it with the browser.
    const modeSpecificAdjuster =
      typeof mode !== "undefined" ? modeConfigs[mode] : undefined
    const modeSpecificAdjustment =
      typeof modeSpecificAdjuster !== "undefined"
        ? modeSpecificAdjuster(browser)
        : {}

    return webpackMerge(baseConfig, modeSpecificAdjustment, {
      name: browser,
      output: {
        path: distPath,
      },
      plugins: [
        // Handle manifest adjustments. Adjustments are looked up and merged:
        //  - by mode (`manifest.<mode>.json`)
        //  - by browser (`manifest.<browser>.json`)
        //  - by mode and browser both (`manifest.<mode>.<browser>.json`)
        //
        // Files that don't exist are ignored, while files with invalid data
        // throw an exception. The merge order means that e.g. a mode+browser
        // adjustment will override a browser adjustment, which will override a
        // mode adjustment in turn.
        //
        // Merging currently only supports adding keys, overriding existing key
        // values if their values are not arrays, or adding entries to arrays.
        // It does not support removing keys or array values. webpackMerge is
        // used for this.
        new CopyPlugin({
          patterns: [
            {
              from: `manifest/manifest(|.${mode}|.${browser}|.${browser}.${mode}).json`,
              to: "manifest.json",
              transformAll: (
                assets: { data: Buffer; sourceFilename: string }[]
              ) => {
                const getPriority = (filename: string) => {
                  switch (true) {
                    case filename.endsWith(`manifest.${browser}.${mode}.json`):
                      return 8
                    case filename.endsWith(`manifest.${browser}.json`):
                      return 4
                    case filename.endsWith(`manifest.${mode}.json`):
                      return 2
                    case filename.endsWith("manifest.json"):
                      return 1
                    default:
                      return 0
                  }
                }

                const combinedManifest = webpackMerge(
                  {},
                  ...assets
                    .sort(
                      (a, b) =>
                        getPriority(a.sourceFilename) -
                        getPriority(b.sourceFilename)
                    )
                    .map((asset) => asset.data.toString("utf8"))
                    // JSON.parse chokes on empty strings
                    .filter((assetData) => assetData.trim().length > 0)
                    .map((assetData) => JSON.parse(assetData))
                )

                return JSON.stringify(combinedManifest, null, 2)
              },
            } as unknown as ObjectPattern, // ObjectPattern doesn't include transformAll in current types
          ],
          // FIXME Forced cast below due to an incompatibility between the webpack
          // FIXME version refed in @types/copy-webpack-plugin and our local
          // FIXME webpack version.
        }) as unknown as WebpackPluginInstance,
      ],
    })
  })
