import path from "path"
import webpack, { Configuration, WebpackOptionsNormalized } from "webpack"
import { merge as webpackMerge } from "webpack-merge"

import SizePlugin from "size-plugin"
import TerserPlugin from "terser-webpack-plugin"
import LiveReloadPlugin from "webpack-livereload-plugin"
import CopyPlugin, { ObjectPattern } from "copy-webpack-plugin"
import WebExtensionArchivePlugin from "./build-utils/web-extension-archive-webpack-plugin"

const supportedBrowsers = ["firefox", "brave", "opera", "chrome"]

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
  devtool: "source-map",
  stats: "errors-only",
  entry: {
    ui: "./src/ui.js",
    background: "./src/background.js",
    // Don't have these yet.....
    // inpage: './src/inpage.js',
    // "content-script": './src/content-script.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules(?!\/@tallyho)|webpack/,
        use: [
          {
            loader: "ts-loader",
            options: { compilerOptions: { noEmit: false } },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules(?!\/@tallyho)|webpack/,
        use: "babel-loader",
      },
    ],
  },
  output: {
    // path: is set browser-specifically below
    filename: "[name].js",
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser"),
    },
  },
  plugins: [
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
    }),
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
      new CopyPlugin({ patterns: ["dev-utils/*.js"] }),
    ],
  }),
  production: (browser) => ({
    plugins: [
      new WebExtensionArchivePlugin({
        filename: browser,
      }),
    ],
  }),
}

// One config per supported browser, adjusted by mode.
export default (
  _: unknown,
  { mode }: WebpackOptionsNormalized
): webpack.Configuration[] =>
  supportedBrowsers.map((browser) => {
    const distPath = path.join(__dirname, "dist", browser)

    return webpackMerge(
      baseConfig,
      // Try to find a build mode config adjustment and call it with the browser.
      (modeConfigs[mode] || (() => ({})))(browser),
      {
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
          }),
        ],
      }
    )
  })
