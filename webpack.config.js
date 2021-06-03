const path = require('path')
const fs = require('fs')
const SizePlugin = require('size-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
const { merge: mergeWebpackConfig } = require("webpack-merge")
const LiveReloadPlugin = require('webpack-livereload-plugin')

const supportedBrowsers = ["firefox","brave","opera","chrome"]


// Replicated for each target browser.
const baseConfig = {
  devtool: 'source-map',
  stats: 'errors-only',
  entry: {
    ui: './ui.js',
    background: './background.js',
    // Don't have these yet.....
    // inpage: './inpage.js',
    // "content-script": './content-script.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader'
      },
      {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/react',
            ]
          }
        }
      }
    ],
  },
  output: {
    // path: is set browser-specifically below
    filename: '[name].js'
  },
  plugins: [
    // polyfill the process and Buffer APIs
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: ['process']
    }),
    new SizePlugin(),
    new LiveReloadPlugin({}),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@tallyho/tally-ui/_locales/',
          to: '_locales/'
        },
        {
          from: 'node_modules/@tallyho/tally-ui/public/',
        },
        {
          from: 'chromereload.js'
        }
      ]
    })
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: false,
          compress: false,
          output: {
            beautify: true,
            indent_level: 2 // eslint-disable-line camelcase
          }
        }
      })
    ],
    splitChunks: { automaticNameDelimiter: '-' }
  }
}

// One config per supported browser.
module.exports = supportedBrowsers.map(browser => {
  const distPath = path.join(__dirname, 'dist', browser)
  const extensionDataPath = path.join(__dirname, "extension")

  // Allow per-browser adjustments to the manifest.
  let manifestAdjustmentString = "{}"
  try {
    manifestAdjustmentString = fs.readFileSync(
      path.join(extensionDataPath, "manifest", `${browser}-tweaks.json`),
      { encoding: "utf8" }
    )
  } catch (e) {} // assume the exception is that the browser-specific tweaks don't exist

  const manifestAdjustments = JSON.parse(manifestAdjustmentString)

  return mergeWebpackConfig(baseConfig, {
    output: {
      path: distPath
    },
    plugins: [
      new CopyPlugin({
        patterns: [
        {
          from: "manifest/manifest.json",
          transform: (content, absolutePath) => {
            const fullContent = content.toString("utf8")
            const manifestJSON = JSON.parse(fullContent)
            const finalManifestJSON = Object.assign(manifestJSON, manifestAdjustments)

            return JSON.stringify(finalManifestJSON, null, 2)
          }
        },
        ]
      })
    ],
    devServer: {
      contentBase: distPath,
      compress: false,
      hot: true,
      port: 9000
    }
  })
})
