// eslint-disable-next-line import/no-extraneous-dependencies
const path = require('path');
const SizePlugin = require('size-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
	devtool: 'source-map',
	stats: 'errors-only',
	entry: {
		background: './src/extension/background',
		// options: './src/extension/options',
		app: './src/app/entry'
	},
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader'
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        include: [
          path.resolve(__dirname, 'node_modules','@reduxjs', 'toolkit')
        ],
        options: {
          allowTsInNodeModules: true
        }
      },
      {
        test: /\.jsx?$/,
        include: [
          path.resolve(__dirname, 'node_modules', '@mechamittens', 'ui'),
          path.resolve(__dirname, 'node_modules', '@mechamittens', 'app'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            'exclude': [
              /node_modules[\\\/]core-js/,
              /node_modules[\\\/]webpack[\\\/]buildin/,
            ],
            presets: [
              '@babel/react',
              [
                '@babel/preset-env',
                {
                  targets: {
                    browsers: [
                      'chrome >= 58',
                      'firefox >= 56.2',
                    ],
                  },
                  useBuiltIns: 'entry',
                  corejs: '3.8',
                },
              ],
            ],
            plugins: [
              '@babel/plugin-transform-runtime',
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-object-rest-spread',
              '@babel/plugin-proposal-optional-chaining',
              '@babel/plugin-proposal-nullish-coalescing-operator',
              '@babel/plugin-transform-object-set-prototype-of-to-assign',
            ]
          },
        }
			},
			{
				test: /\.s[ac]ss$/i,
				use: [
					'style-loader',
					// CSS to CJS, ignoring URLs so images and whatnot can be resolved from the
          // final build
					'css-loader?url=false',
					// SCSS to CSS
					'sass-loader',
				],
			},
		],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
    alias: {
      stream: 'stream-browserify',
    }
  },
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].js'
	},
	plugins: [
    // polyfill the process and Buffer APIs
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: ['process']
    }),
		new SizePlugin(),
		new CopyWebpackPlugin([
			{
        from: 'node_modules/@mechamittens/app/_locales',
        to: '_locales/'
			},
			{
        from: 'node_modules/@mechamittens/app/images/**/*',
        to: 'images/'
			},
			{
				from: '**/*',
				context: 'src/extension',
				ignore: ['*.js', '*.ts', '*.jsx', '*.tsx']
			},
			{
				from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'
			}
		])
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
		]
	}
};
