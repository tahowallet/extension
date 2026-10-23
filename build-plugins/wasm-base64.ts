/* oxlint-disable import/prefer-default-export */
import type { BunPlugin } from "bun"

/**
 * Bun plugin that embeds .wasm files as base64-encoded strings,
 * replicating the base64-loader webpack behavior.
 */
export const wasmBase64Plugin: BunPlugin = {
  name: "wasm-base64",
  setup(build) {
    build.onLoad({ filter: /\.wasm$/ }, async (args) => {
      const file = Bun.file(args.path)
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")

      return {
        contents: `module.exports = "${base64}"`,
        loader: "js",
      }
    })
  },
}
