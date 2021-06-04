# tally-extension

Tally is a community owned and operated Web3 wallet, built as a
[WebExtension](https://browserext.github.io/browserext/).

## Package Structure, Build Structure, and Threat Model

The extension is built as two packages, one for the wallet and one for the
frontend UI. These are separate packages in order to emphasize the difference
in attack surface and clearly separate the threat models of the two packages.
In particular, the frontend UI is considered completely untrusted code, while
the wallet is considered trusted code. Only the wallet should interact directly
with key material, while the frontend should only interact with key material
via a carefully-maintained public API.

The wallet package is also intended to minimize external dependencies where
possible, to reduce the surface exposed to a supply chain attack. Dependencies
are generally version-pinned, and yarn is used to ensure the integrity of
builds.

## Building and Developing

Builds are designed to be run from the top level of the repository.

### Quickstart

```sh
$ yarn install # install all dependencies; rerun with --ignore-scripts if
               # scrypt node-gyp failures prevent the install from completing
$ yarn start # start a continuous webpack build that will auto-update with changes
```

Once the continuous webpack build is running, you can install the extension in
your dev browser of choice:

- [Firefox instructions](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)
- [Chrome, Brave, and Opera instructions](https://developer.chrome.com/docs/extensions/mv3/getstarted/#manifest)
    * Note that these instructions are for Chrome, but substituting
      `brave://extensions` or `opera://extensions` for `chrome://extensions`
      depending on browser should get you to the same buttons.

Extension bundles for each browser are in `dist/<browser>`.

### Additional Scripts

```sh
$ yarn build # create a production build of the extension
```

The build script will generate a ZIP file for each browser bundle under the
`dist/` directory.

```sh
$ yarn lint # lint all sources in all projects
$ yarn test # run all tests in all projects
```

## File Structure

Extension content lives directly under the root directory alongside
project-level configuration and utilities, including GitHub-specific
functionality in `.github`. Extension content should be minimal, and
largely simply glue together UI and wallet code. Manifest information
is managed in the `manifest/` subdirectory as described below (see the
[`build/merge-manifest.js`](./build/merge-manifest.js) helper).

Here is a light guide to the directory structure:

```
.github/ # GitHub-specific tooling

package.json      # private extension package
webpack.config.js # Webpack build for extension

src/ # extension source files
  background.js # entry file for the background extension script; should be
                # minimal and call in to @tallyho/tally-wallet
  ui.js         # entry file for the frontend UI; should be minimal and bind
                # the functionality in @tallyho/tally-ui

dist/ # output directory for builds
  brave/   # browser-specific
  firefox/ # build
  chrome/  # directories

build/            # build-related helpers, mostly used in webpack.config.js
  extension-reload.js # LiveReload support for the extension.
manifest/         # extension manifest data
  manifest.json             # common manifest data for all browsers
  manifest.chrome.json      # manifest adjustments for Chrome
  manifest.dev.json         # manifest adjustments for dev environment
  manifest.firefox.dev.json # manifest adjustments for Firefox in dev

ui/ # @tallyho/tally-ui package
  package.json

wallet/ # @tallyho/tally-wallet package with background script
  package.json
```
