/* oxlint-disable import/prefer-default-export */
import path from "path"
import type { BunPlugin } from "bun"

const GLOBALS_SHIM = path.resolve(import.meta.dir, "browser-globals.ts")

/**
 * Bun plugin that provides global Buffer + process for browser builds.
 *
 * Bun auto-polyfills most Node built-in modules (buffer, stream, crypto,
 * path, fs, events, etc.) when target is "browser", but does NOT make
 * Buffer or process available as globals. This plugin injects a shim into
 * entrypoints that sets them on globalThis.
 *
 * The bare "process" import is redirected to the npm process package's
 * browser entry, since Bun's built-in node:process polyfill lacks a
 * default export.
 */
export const nodePolyfillsPlugin: BunPlugin = {
  name: "node-polyfills",
  setup(build) {
    // Redirect bare "process" import to the npm package's browser entry
    build.onResolve({ filter: /^process$/ }, () => ({
      path: require.resolve("process/browser"),
    }))

    // Inject Buffer + process globals into entrypoint files so they're
    // available to all bundled code at runtime.
    build.onLoad(
      {
        filter:
          /src\/(popup|tab|background|window-provider|provider-bridge)\.ts$/,
      },
      async (args) => {
        const contents = await Bun.file(args.path).text()
        return {
          contents: `import "${GLOBALS_SHIM}";\n${contents}`,
          loader: "ts",
        }
      },
    )
  },
}
