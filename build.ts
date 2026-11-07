/* oxlint-disable no-continue, no-console, no-plusplus, no-bitwise, no-useless-escape, no-await-in-loop */
import path from "path"
import fs from "fs"
import archiver from "archiver"
import { merge as deepMerge } from "webpack-merge"
import { styledJsxPlugin } from "./build-plugins/styled-jsx"
import { nodePolyfillsPlugin } from "./build-plugins/node-polyfills"
import { wasmBase64Plugin } from "./build-plugins/wasm-base64"
import "dotenv-defaults/config"

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const isProduction = args.includes("--production")
const isWatch = args.includes("--watch")
const mode = isProduction ? "production" : "development"

// ---------------------------------------------------------------------------
// Browser targets
// ---------------------------------------------------------------------------
const supportedBrowsers = ["chrome"]
if (process.env.SUPPORT_BROWSER === "firefox") {
  supportedBrowsers.push("firefox")
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

// Color only for a terminal, never in CI logs or piped output. NO_COLOR turns
// it off, and FORCE_COLOR turns it on (or off, with 0 or false) regardless.
const forceColor = process.env.FORCE_COLOR
const useColor =
  forceColor !== undefined
    ? !["0", "false"].includes(forceColor)
    : !process.env.NO_COLOR && process.stdout.isTTY

const ansi =
  (open: number, close: number) =>
  (text: string): string =>
    useColor ? `\x1b[${open}m${text}\x1b[${close}m` : text
const bold = ansi(1, 22)
const dim = ansi(2, 22)
const red = ansi(31, 39)
const green = ansi(32, 39)
const cyan = ansi(36, 39)

/** Formats a duration in milliseconds as `850ms`, `1.2s` or `1m 5s`. */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/** The time since `start`, from `performance.now()`, formatted. */
const sinceStart = (start: number) => formatDuration(performance.now() - start)

/** A dimmed "in 1.2s" for the end of a stage's log line. */
const elapsed = (start: number) => dim(`in ${sinceStart(start)}`)

const byteFormats = (signDisplay: "auto" | "exceptZero") => ({
  // Long style reads "413 bytes", where short would read "413 byte"
  byte: new Intl.NumberFormat("en-US", {
    style: "unit",
    unit: "byte",
    unitDisplay: "long",
    signDisplay,
  }),
  kilobyte: new Intl.NumberFormat("en-US", {
    style: "unit",
    unit: "kilobyte",
    unitDisplay: "short",
    signDisplay,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }),
  megabyte: new Intl.NumberFormat("en-US", {
    style: "unit",
    unit: "megabyte",
    unitDisplay: "short",
    signDisplay,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }),
})
const sizeFormats = byteFormats("auto")
const changeFormats = byteFormats("exceptZero")

/** Formats a byte count in bytes under 1 kB, then in kB, then in MB. */
function formatBytes(bytes: number, formats = sizeFormats): string {
  const magnitude = Math.abs(bytes)
  if (magnitude < 1000) return formats.byte.format(bytes)
  // Move up a unit where rounding would otherwise print "1,000.0 kB"
  if (magnitude < 999_950) return formats.kilobyte.format(bytes / 1000)
  return formats.megabyte.format(bytes / 1_000_000)
}

// ---------------------------------------------------------------------------
// Git branch info (used for dev build badges and version strings)
// ---------------------------------------------------------------------------
let gitBranch = ""
try {
  gitBranch = (await Bun.$`git branch --show-current`.text()).trim()
} catch {
  // not a git repo or detached HEAD
}

const baseVersion = process.env.npm_package_version ?? ""

// Release channel builds, such as beta, are published to their own store
// listing. Store versions must keep increasing, so the build number becomes a
// fourth version part.
const releaseChannel = process.env.RELEASE_CHANNEL ?? ""
const buildNumber = process.env.BUILD_NUMBER ?? ""
if (releaseChannel && !/^\d+$/.test(buildNumber)) {
  throw new Error(`RELEASE_CHANNEL=${releaseChannel} needs a BUILD_NUMBER`)
}
const channelVersion = releaseChannel ? `${baseVersion}.${buildNumber}` : ""

let buildVersion = baseVersion
if (channelVersion) {
  buildVersion = `${channelVersion} ${releaseChannel}`
} else if (!isProduction && gitBranch) {
  buildVersion = `${baseVersion}+${gitBranch}`
}

// ---------------------------------------------------------------------------
// Environment variables — replicate dotenv-webpack behaviour
// ---------------------------------------------------------------------------
function loadEnvDefines(): Record<string, string> {
  const defaultsPath = path.resolve(".env.defaults")
  const envDefaults = fs.existsSync(defaultsPath)
    ? fs.readFileSync(defaultsPath, "utf8")
    : ""

  // Collect all env keys from .env.defaults
  const envKeys = new Set<string>()
  for (const line of envDefaults.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/)
    if (match) envKeys.add(match[1])
  }

  // Scan source for process.env.* references so every key gets a define,
  // even if it's not in .env.defaults. Without this, Bun leaves them as
  // bare `process.env.X` which fails at runtime (no process global in
  // browsers). dotenv-webpack handled this automatically.
  const srcDirs = [
    "src",
    "background",
    "ui",
    "provider-bridge",
    "provider-bridge-shared",
    "window-provider",
  ]
  for (const dir of srcDirs) {
    const dirPath = path.resolve(dir)
    if (!fs.existsSync(dirPath)) continue
    for (const file of fs.readdirSync(dirPath, { recursive: true })) {
      const filePath = path.join(dirPath, String(file))
      if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) continue
      if (!fs.statSync(filePath).isFile()) continue
      const src = fs.readFileSync(filePath, "utf8")
      for (const m of src.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) {
        envKeys.add(m[1])
      }
    }
  }

  const defines: Record<string, string> = {}
  for (const key of envKeys) {
    defines[`process.env.${key}`] = JSON.stringify(process.env[key] ?? "")
  }

  defines["process.env.VERSION"] = JSON.stringify(buildVersion)
  defines["process.env.NODE_ENV"] = JSON.stringify(mode)

  return defines
}

const envDefines = loadEnvDefines()

// ---------------------------------------------------------------------------
// Manifest merging
// ---------------------------------------------------------------------------
function mergeManifest(browser: string): string {
  const manifestDir = path.resolve("manifest")

  // Ordered by priority: base, mode, browser, browser+mode, release channel
  const candidates = [
    "manifest.json",
    `manifest.${mode}.json`,
    `manifest.${browser}.json`,
    `manifest.${browser}.${mode}.json`,
    ...(releaseChannel ? [`manifest.${releaseChannel}.json`] : []),
  ]

  const layers: object[] = []
  for (const name of candidates) {
    const filePath = path.join(manifestDir, name)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8").trim()
      if (content.length > 0) {
        layers.push(JSON.parse(content))
      }
    }
  }

  const merged = deepMerge({}, ...layers)
  return JSON.stringify(merged, null, 2)
}

// ---------------------------------------------------------------------------
// Static asset copying
// ---------------------------------------------------------------------------
function copyStaticAssets(browser: string, outdir: string) {
  const uiPublicDir = path.resolve("node_modules/@tallyho/tally-ui/public")

  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true })
  }

  // Copy all files from ui/public/ to dist/<browser>/
  copyDirRecursive(uiPublicDir, outdir)

  // In dev mode, inject React DevTools script and copy dev-utils
  if (mode === "development") {
    const port = process.env.REACT_DEVTOOLS_DEFAULT_PORT || "8097"
    for (const file of fs.readdirSync(outdir)) {
      if (file.endsWith(".html")) {
        const htmlPath = path.join(outdir, file)
        let html = fs.readFileSync(htmlPath, "utf8")
        html = html.replace(
          "<!-- INSERT_REACT_DEV_TOOLS_HERE -->",
          `<script src="http://localhost:${port}"></script>`,
        )
        fs.writeFileSync(htmlPath, html)
      }
    }

    // Copy dev-utils
    const devUtilsDir = path.resolve("dev-utils")
    if (fs.existsSync(devUtilsDir)) {
      for (const file of fs.readdirSync(devUtilsDir)) {
        if (file.endsWith(".js")) {
          fs.copyFileSync(path.join(devUtilsDir, file), path.join(outdir, file))
        }
      }
    }
  }
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// ---------------------------------------------------------------------------
// Icon badge overlay (dev and release channel builds)
// ---------------------------------------------------------------------------

// Build initials: split on / and -, take first letter of each, cap at 4
const branchInitials = (branch: string) =>
  branch
    .split(/[/\-]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase())
    .slice(0, 4)
    .join("")

/** Badges the icon with `initials`, coloured by a hash of `colorSeed`. */
async function overlayBadge(
  outdir: string,
  initials: string,
  colorSeed: string,
) {
  if (!initials) return

  // Hash the seed → hue
  let hash = 0
  for (let i = 0; i < colorSeed.length; i++) {
    hash = (hash * 31 + colorSeed.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  const bgColor = `hsl(${hue}, 65%, 45%)`

  // SVG badge in bottom-left corner of 128x128 canvas.
  // Composited with blend:'atop' so the icon's own alpha masks the badge,
  // giving the bottom-left corner its natural rounding.
  const r = 8
  const H = 48
  const W = 28 + initials.length * 18
  const Y = 128 - H
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <rect x="0" y="${Y}" width="${W}" height="${H}" rx="${r}" ry="${r}" fill="${bgColor}"/>
  <text x="${W / 2 + 2}" y="${Y + 34}" font-family="Arial,Helvetica,sans-serif"
    font-size="26" font-weight="bold" fill="white" text-anchor="middle">${initials}</text>
</svg>`

  const iconPath = path.join(outdir, "icon-128.png")
  if (!fs.existsSync(iconPath)) return

  const sharp = (await import("sharp")).default
  const buf = await sharp(iconPath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0, blend: "atop" }])
    .png()
    .toBuffer()

  fs.writeFileSync(iconPath, buf)
  console.log(`  Badge "${initials}" applied to icon (${colorSeed})`)
}

// ---------------------------------------------------------------------------
// Archive creation (production only)
// ---------------------------------------------------------------------------
async function createArchive(browser: string, outdir: string): Promise<void> {
  const distDir = path.resolve("dist")
  const outputPath = path.join(distDir, `${browser}.zip`)

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    output.on("close", () => resolve())
    output.on("error", (err) => reject(err))

    const archive = archiver("zip", { zlib: { level: 9 } })
    archive.pipe(output)
    archive.directory(outdir, false)
    archive.finalize()
  })
}

// ---------------------------------------------------------------------------
// Bundle size tracking
// ---------------------------------------------------------------------------
function trackBundleSizes(outdir: string) {
  const sizePluginPath = path.resolve("size-plugin.json")

  // Read previous entries
  let history: Array<{
    timestamp: number
    files: Array<{
      filename: string
      previous: number
      size: number
      diff: number
    }>
  }> = []
  if (fs.existsSync(sizePluginPath)) {
    try {
      history = JSON.parse(fs.readFileSync(sizePluginPath, "utf8"))
    } catch {
      history = []
    }
  }

  // Get previous sizes from most recent entry
  const previousSizes: Record<string, number> = {}
  if (history.length > 0) {
    for (const file of history[0].files) {
      previousSizes[file.filename] = file.size
    }
  }

  // Scan current output
  const files: Array<{
    filename: string
    previous: number
    size: number
    diff: number
  }> = []
  for (const file of fs.readdirSync(outdir)) {
    const filePath = path.join(outdir, file)
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      const { size } = stat
      const previous = previousSizes[file] ?? 0
      files.push({ filename: file, previous, size, diff: size - previous })
    }
  }

  files.sort((a, b) => a.filename.localeCompare(b.filename))

  // Log sizes and changes in aligned columns. Widths are measured before
  // coloring, since escape codes take up no space on screen.
  const rows = files.map((f) => ({
    name: f.filename,
    size: formatBytes(f.size),
    change: formatBytes(f.diff, changeFormats),
    diff: f.diff,
  }))
  const nameWidth = Math.max(...rows.map((r) => r.name.length))
  const sizeWidth = Math.max(...rows.map((r) => r.size.length))
  const changeWidth = Math.max(...rows.map((r) => r.change.length))

  console.log(`\n${bold(cyan("Bundle sizes:"))}`)
  for (const r of rows) {
    let changeColor = dim
    if (r.diff > 0) changeColor = red
    else if (r.diff < 0) changeColor = green
    console.log(
      `  ${dim(r.name.padEnd(nameWidth))}  ${r.size.padStart(sizeWidth)}  ${changeColor(r.change.padStart(changeWidth))}`,
    )
  }

  // Prepend new entry
  history.unshift({ timestamp: Date.now(), files })

  // Keep max 20 entries
  if (history.length > 20) {
    history = history.slice(0, 20)
  }

  fs.writeFileSync(sizePluginPath, JSON.stringify(history))
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------
async function buildForBrowser(browser: string) {
  const outdir = path.resolve("dist", browser)

  // Clean output directory
  if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true })
  }

  const shouldMinify = browser === "firefox" && isProduction
  const sourcemap =
    browser === "firefox" && isProduction
      ? ("none" as const)
      : ("external" as const)

  console.log(`\n${bold(cyan(`Building for ${browser} (${mode})...`))}`)
  const buildStart = performance.now()

  const result = await Bun.build({
    entrypoints: [
      "./src/popup.ts",
      "./src/tab.ts",
      "./src/theme.ts",
      "./src/background.ts",
      "./src/window-provider.ts",
      "./src/provider-bridge.ts",
    ],
    outdir,
    splitting: false,
    naming: "[name].[ext]",
    target: "browser",
    sourcemap,
    minify: shouldMinify,
    check: true,
    plugins: [styledJsxPlugin, nodePolyfillsPlugin, wasmBase64Plugin],
    define: {
      ...envDefines,
      global: "globalThis",
    },
  })

  if (!result.success) {
    console.error(`Build failed for ${browser}:`)
    for (const log of result.logs) {
      console.error(log)
    }
    process.exit(1)
  }

  console.log(
    `  Bundled ${result.outputs.length} output files ${elapsed(buildStart)}`,
  )

  // Copy static assets
  const assetsStart = performance.now()
  copyStaticAssets(browser, outdir)

  // Overlay a badge on the icon for dev and release channel builds
  if (channelVersion) {
    await overlayBadge(outdir, "β", releaseChannel)
  } else if (!isProduction && gitBranch) {
    await overlayBadge(outdir, branchInitials(gitBranch), gitBranch)
  }

  // Write merged manifest, adding version_name with branch or channel info
  const manifestObj = JSON.parse(mergeManifest(browser))
  if (channelVersion) {
    manifestObj.version = channelVersion
    manifestObj.version_name = buildVersion
  } else if (!isProduction && gitBranch) {
    manifestObj.version_name = buildVersion
  }
  fs.writeFileSync(
    path.join(outdir, "manifest.json"),
    JSON.stringify(manifestObj, null, 2),
  )
  console.log(`  Copied assets and wrote manifest ${elapsed(assetsStart)}`)

  // Track bundle sizes (only for first browser to avoid duplicates)
  if (browser === "chrome") {
    trackBundleSizes(outdir)
  }

  // Create archive in production
  if (isProduction) {
    const archiveStart = performance.now()
    await createArchive(browser, outdir)
    console.log(`  Created ${browser}.zip ${elapsed(archiveStart)}`)
  }

  console.log(`  ${bold(`Built ${browser} in ${sinceStart(buildStart)}`)}`)
}

/** Builds every supported browser, then logs how long they took. */
async function buildAll(done: string) {
  const start = performance.now()
  for (const browser of supportedBrowsers) {
    await buildForBrowser(browser)
  }
  console.log(`\n${bold(green(`${done} in ${sinceStart(start)}`))}`)
}

// ---------------------------------------------------------------------------
// Watch mode
// ---------------------------------------------------------------------------
async function watchMode() {
  // Initial build
  await buildAll("Build complete")
  console.log(cyan("Watching for changes..."))

  const watchDirs = [
    "src",
    "ui",
    "background",
    "provider-bridge",
    "provider-bridge-shared",
    "window-provider",
  ]

  for (const dir of watchDirs) {
    const dirPath = path.resolve(dir)
    if (!fs.existsSync(dirPath)) continue

    fs.watch(dirPath, { recursive: true }, async (event, filename) => {
      if (!filename) return
      // Ignore non-source files
      if (!/\.(ts|tsx|js|jsx|json|css|html)$/.test(filename)) return

      console.log(
        `\n${dim(`[${new Date().toLocaleTimeString()}]`)} ${filename} changed, rebuilding...`,
      )
      try {
        await buildAll("Rebuild complete")
      } catch (err) {
        console.error("Rebuild failed:", err)
      }
    })
  }

  // Keep process alive
  await new Promise(() => {})
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  console.log(`${dim("Mode:")} ${mode}`)
  console.log(`${dim("Browsers:")} ${supportedBrowsers.join(", ")}`)

  if (isWatch) {
    await watchMode()
  } else {
    await buildAll("Build complete")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
