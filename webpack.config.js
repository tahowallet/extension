const path = require('path')
const fs = require('fs')
const SizePlugin = require('size-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
const { merge: webpackMerge } = require("webpack-merge")
const LiveReloadPlugin = require('webpack-livereload-plugin')

const supportedBrowsers = ["firefox","brave","opera","chrome"]


// Replicated and adjusted for each target browser and the current build mode.
const baseConfig = {
  devtool: 'source-map',
  stats: 'errors-only',
  entry: {
    ui: './src/ui.js',
    background: './src/background.js',
    // Don't have these yet.....
    // inpage: './src/inpage.js',
    // "content-script": './src/content-script.js'
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
            plugins: ['styled-jsx/babel'],
            presets: ['@babel/react'],
          },
        },
      },
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
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@tallyho/tally-ui/_locales/',
          to: '_locales/'
        },
        {
          from: 'node_modules/@tallyho/tally-ui/public/',
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

// Configuration adjustments for specific build modes.
const modeConfigs = {
  "development": {
    plugins: [
      new LiveReloadPlugin({}),
      new CopyPlugin({ patterns: ['dev-utils/*.js'] })
    ],
  },
  "production": {
    plugins: [
      // something for ZIP files, eh?
    ]
  }
}

// One config per supported browser, adjusted by mode.
module.exports = (_, { mode }) => supportedBrowsers.map(browser => {
  const distPath = path.join(__dirname, 'dist', browser)

  return webpackMerge(
    baseConfig,
    // Try to find a build mode config adjustment.
    modeConfigs[mode] || {},
    {
      output: {
        path: distPath
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
              to: 'manifest.json',
              transformAll: (assets) => {
                const combinedManifest = webpackMerge(
                  ...(
                    assets
                      .map(_ => _.data.toString('utf8'))
                      // JSON.parse chokes on empty strings
                      .filter(_ => _.trim().length > 0)
                      .map(JSON.parse)
                  )
                )

                return JSON.stringify(combinedManifest, null, 2)
              }
            },
          ]
        })
      ],
  })
})
