/* oxlint-disable no-console */
/**
 * Benchmarks the history service's chart queries and write paths in Chromium,
 * against real IndexedDB, at several numbers of held tokens. Reports how long
 * each operation took and the longest the event loop went without a turn
 * while it ran, against targets of under 500ms to load a chart's data and no
 * stall over 100ms.
 *
 * Usage: bun scripts/benchmarks/history.ts [holdings...]
 *
 * Set CHROMIUM_PATH to run a Chromium other than the one Playwright installed.
 *
 * Each holdings count is spread across 5 accounts and 20 chains, with every
 * token its own asset, and two years of fully backfilled, compacted history.
 */
import { chromium } from "@playwright/test"
import fs from "fs"
import http from "http"
import os from "os"
import path from "path"

const CHART_TARGET_MS = 500
const STALL_TARGET_MS = 100

const holdingCounts = process.argv.slice(2).map(Number)
const scenarios = (
  holdingCounts.length > 0 ? holdingCounts : [250, 500, 1000, 3000]
).map((holdings) => ({ holdings, accounts: 5, chains: 20 }))

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "history-benchmark-"))
const build = await Bun.build({
  entrypoints: [path.join(import.meta.dir, "history-page.ts")],
  outdir: directory,
  target: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
})
if (!build.success) {
  console.error(build.logs)
  process.exit(1)
}
fs.writeFileSync(
  path.join(directory, "index.html"),
  // The history service imports webextension-polyfill, which only loads
  // where it looks like an extension.
  `<script>
    window.process = { env: {} }
    window.global = window
    window.chrome = { runtime: { id: "history-benchmark" } }
  </script>
  <script src="history-page.js"></script>`,
)

// IndexedDB needs a real origin, so the page is served rather than opened.
const server = http
  .createServer((request, response) => {
    const file = path.join(
      directory,
      path.basename(request.url === "/" ? "index.html" : (request.url ?? "")),
    )
    if (fs.existsSync(file)) {
      response.end(fs.readFileSync(file))
    } else {
      response.statusCode = 404
      response.end()
    }
  })
  .listen(0)
const address = server.address()
const port = typeof address === "object" && address !== null ? address.port : 0

// CHROMIUM_PATH points at a browser other than the one Playwright installed.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
})
const page = await browser.newPage()
page.on("pageerror", (error) => console.error("page error:", error.message))
await page.goto(`http://localhost:${port}/`)
await page.waitForFunction(() => "runHistoryBenchmark" in globalThis)

let missed = false
for (const scenario of scenarios) {
  // oxlint-disable-next-line no-await-in-loop
  const report = await page.evaluate(
    (args) =>
      (
        globalThis as unknown as {
          runHistoryBenchmark: (a: typeof args) => Promise<{
            seedMs: number
            results: Record<string, { ms: number; longestStallMs: number }>
          }>
        }
      ).runHistoryBenchmark(args),
    scenario,
  )
  console.log(
    `\n${scenario.holdings} held tokens, ${scenario.accounts} accounts, ${scenario.chains} chains (seeded in ${report.seedMs}ms)`,
  )
  Object.entries(report.results).forEach(([name, { ms, longestStallMs }]) => {
    const chartMiss = name.includes("chart") && ms > CHART_TARGET_MS
    const stallMiss = longestStallMs > STALL_TARGET_MS
    missed ||= chartMiss || stallMiss
    console.log(
      `  ${name.padEnd(36)} ${String(ms).padStart(6)}ms${chartMiss ? " !" : "  "}  longest stall ${String(longestStallMs).padStart(4)}ms${stallMiss ? " !" : ""}`,
    )
  })
}

await browser.close()
server.close()
fs.rmSync(directory, { recursive: true, force: true })
console.log(
  missed
    ? `\nSome results missed their targets (marked !): charts under ${CHART_TARGET_MS}ms, no stall over ${STALL_TARGET_MS}ms.`
    : `\nEverything met its targets: charts under ${CHART_TARGET_MS}ms, no stall over ${STALL_TARGET_MS}ms.`,
)
process.exit(missed ? 1 : 0)
