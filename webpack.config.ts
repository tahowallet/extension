import path from "path"
import webpack, {
  Configuration,
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

const supportedBrowsers = ["firefox", "brave", "opera", "chrome"]

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
  devtool: "source-map",
  stats: "errors-only",
  entry: {
    ui: "./src/ui.ts",
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
          from: "node_modules/@tallyho/tally-ui/_locales/",
          to: "_locales/",
        },
        {
          from: "node_modules/@tallyho/tally-ui/public/",
        },
      ],
      // FIXME Forced cast below due to an incompatibility between the webpack
      // FIXME version refed in @types/copy-webpack-plugin and our local
      // FIXME webpack version.
    }) as unknown as WebpackPluginInstance,
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
    plugins: [
      new WebExtensionArchivePlugin({
        filename: browser,
      }),
    ],
    optimization: {
      minimizer: [
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
              transformAll: (assets: { data: Buffer }[]) => {
                const combinedManifest = webpackMerge(
                  {},
                  ...assets
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
