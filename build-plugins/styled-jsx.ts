/* oxlint-disable import/prefer-default-export */
import type { BunPlugin } from "bun"

/**
 * Bun plugin that intercepts .tsx/.jsx files containing styled-jsx (<style jsx>)
 * and runs them through Babel with the styled-jsx/babel plugin.
 *
 * Files without styled-jsx fall through to Bun's native TS/JSX transform.
 */
export const styledJsxPlugin: BunPlugin = {
  name: "styled-jsx",
  setup(build) {
    const filter = /\.[tj]sx$/

    build.onLoad({ filter }, async (args) => {
      const source = await Bun.file(args.path).text()

      // Fast check: skip files that don't use styled-jsx
      if (!source.includes("style jsx")) {
        return undefined // fall through to Bun's native loader
      }

      // Lazy-load Babel — only needed for files with styled-jsx
      const babel = await import("@babel/core")
      const result = await babel.transformAsync(source, {
        filename: args.path,
        presets: ["@babel/preset-typescript", "@babel/preset-react"],
        plugins: ["styled-jsx/babel"],
      })

      if (!result?.code) {
        throw new Error(`Babel transform failed for ${args.path}`)
      }

      return {
        contents: result.code,
        loader: "js", // Babel fully transforms TS + JSX
      }
    })
  },
}
