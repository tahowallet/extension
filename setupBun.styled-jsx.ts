import { plugin } from "bun"
import { resolve } from "path"

/**
 * Bun test-runner plugin that intercepts .tsx/.jsx source files containing
 * styled-jsx and runs them through Babel with the styled-jsx/babel plugin,
 * matching the production build pipeline (build-plugins/styled-jsx.ts).
 *
 * Without this, styled-jsx renders unscoped <style> tags in tests, causing CSS
 * collisions when multiple instances of the same component are rendered.
 *
 * We pre-scan ui/ to find only files that actually use styled-jsx. Files
 * without styled-jsx are passed through with their original content.
 */

// Work around a bun bug: registering a plugin changes CJS module loading
// behavior, causing Error.captureStackTrace to fail in follow-redirects
// (and similar libraries) with "First argument must be an Error object".
// Patch captureStackTrace to gracefully handle non-Error objects.
const origCaptureStackTrace = Error.captureStackTrace
if (origCaptureStackTrace) {
  Error.captureStackTrace = function (target, ...rest) {
    try {
      return origCaptureStackTrace.call(this, target, ...rest)
    } catch {
      // If target isn't an Error, set .stack manually
      if (target && typeof target === "object") {
        target.stack = new Error().stack
      }
    }
  }
}

const { execSync } = await import("child_process")
const projectRoot = import.meta.dir

const styledJsxFiles = new Set(
  execSync(
    'grep -rl "style jsx" --include="*.tsx" --include="*.jsx" ui/ 2>/dev/null || true',
    { encoding: "utf-8", cwd: projectRoot },
  )
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((f) => resolve(projectRoot, f)),
)

plugin({
  name: "styled-jsx",
  setup(build) {
    // Only match .tsx/.jsx files under /ui/ — backend code doesn't use
    // styled-jsx and shouldn't be re-processed by the plugin.
    build.onLoad({ filter: /\/ui\/.*\.[tj]sx$/ }, async (args) => {
      const source = await Bun.file(args.path).text()

      if (!styledJsxFiles.has(args.path)) {
        return { contents: source, loader: "tsx" }
      }

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
        loader: "js",
      }
    })
  },
})
