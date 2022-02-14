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
import { GitRevisionPlugin } from "git-revision-webpack-plugin"
import WebExtensionArchivePlugin from "./build-utils/web-extension-archive-webpack-plugin"

const supportedBrowsers = ["firefox", "brave", "opera", "chrome"] as const
const featureSets = [null, "experimental"] as const

const variants = featureSets.flatMap((features) =>
  supportedBrowsers.map((browser) => ({ browser, features }))
)

const gitRevisionPlugin = new GitRevisionPlugin()

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
  devtool: "source-map",
  stats: "errors-only",
  entry: {
    ui: "./src/ui.ts",
    "tab-ui": "./src/tab-ui.ts",
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
    gitRevisionPlugin,
    new DefinePlugin({
      "process.env.GIT_COMMIT_HASH": JSON.stringify(
        gitRevisionPlugin.commithash()
      ),
      "process.env.GIT_COMMIT_DATE": JSON.stringify(
        gitRevisionPlugin.lastcommitdatetime()
      ),
      "process.env.GIT_BRANCH": JSON.stringify(gitRevisionPlugin.branch()),
      "process.env.VERSION": JSON.stringify(gitRevisionPlugin.version()),
    }),
  ],
  optimization: {
    splitChunks: { automaticNameDelimiter: "-" },
  },
}

// Configuration adjustments for specific build modes.
const modeConfigs: Record<string, Partial<Configuration>> = {
  development: {
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
  },
}

type MultiConfiguration = webpack.Configuration[] & { parallelism?: number }

const multiCompilerParallelism = 4 // Reduce parallelism to limit memory usage

// One config per supported browser and feature set, adjusted by mode.
export default (
  _: unknown,
  { mode }: WebpackOptionsNormalized
): MultiConfiguration => {
  const configurations: MultiConfiguration = variants.map((variant) => {
    const { browser, features } = variant
    const name = [browser, features].filter((x) => x !== null).join("-")
    const distPath = path.join(__dirname, "dist", name)

    const featuresSuffix = features === null ? `` : `.${features}`

    const variantConfig: Partial<Configuration> = {
      name,
      output: {
        path: distPath,
      },
      plugins: [
        new Dotenv({
          path: `.env.features${featuresSuffix}`,
        }),
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
    }

    // Configuration adjustments for specific build modes and variant.
    const variantModeConfigs: Record<string, Partial<Configuration>> = {
      production: {
        plugins: [
          new WebExtensionArchivePlugin({
            filename: name,
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
      },
    }

    return webpackMerge(
      baseConfig,
      modeConfigs[mode ?? "none"] ?? {},
      variantConfig,
      variantModeConfigs[mode ?? "none"] ?? {}
    )
  })

  configurations.parallelism = multiCompilerParallelism

  return configurations
}
