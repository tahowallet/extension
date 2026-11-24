/**
 * The page side of the history benchmark; see `history.ts`, which bundles this
 * file and runs it in Chromium. It seeds the indexing database with a given
 * number of held tokens, then times the indexing service's chart queries and
 * history write paths, and the longest the event loop went without a turn
 * during each.
 */
import Dexie from "dexie"
import { DAY, HOUR, MINUTE } from "../../background/constants"
import { IndexingDatabase } from "../../background/services/indexing/db"
import {
  BalanceMeasurement,
  PriceMeasurement,
  balanceSeriesKeyFor,
} from "../../background/services/indexing/history/records"
import IndexingService from "../../background/services/indexing"
import type { FullAssetID } from "../../background/redux-slices/utils/asset-utils"

const WEEK = 7 * DAY

/**
 * The times a fully backfilled, compacted series has over two years: one
 * point every `recentSpacing` for the last day, then hourly for a week, daily
 * for three months, and weekly beyond.
 */
function compactedTimes(now: number, recentSpacing: number): number[] {
  const times: number[] = []
  for (let time = now - 730 * DAY; time < now - 90 * DAY; time += WEEK) {
    times.push(time)
  }
  for (let time = now - 90 * DAY; time < now - 7 * DAY; time += DAY) {
    times.push(time)
  }
  for (let time = now - 7 * DAY; time < now - DAY; time += HOUR) {
    times.push(time)
  }
  for (let time = now - DAY; time < now; time += recentSpacing) {
    times.push(time)
  }
  return times
}

export type Scenario = {
  holdings: number
  accounts: number
  chains: number
}

/** Runs `work`, returning how long it took and the longest event loop stall. */
async function measure(work: () => Promise<unknown>) {
  let longestStall = 0
  let last = performance.now()
  const probe = setInterval(() => {
    const now = performance.now()
    longestStall = Math.max(longestStall, now - last)
    last = now
  }, 0)
  const start = performance.now()
  await work()
  const elapsed = performance.now() - start
  clearInterval(probe)
  longestStall = Math.max(longestStall, performance.now() - last)
  return { ms: Math.round(elapsed), longestStallMs: Math.round(longestStall) }
}

async function run({ holdings, accounts, chains }: Scenario) {
  await Dexie.delete("tally/indexing")
  const db = new IndexingDatabase()
  const now = Date.now()
  const addresses = Array.from(
    { length: accounts },
    (_, index) => `0x${(index + 1).toString(16).padStart(40, "0")}`,
  )
  const balanceTimes = compactedTimes(now, HOUR)
  const priceTimes = compactedTimes(now, 5 * MINUTE)

  // Each held token is its own asset on one of the chains, priced by its own
  // price series, which is the most series a chart can have to read.
  const held = Array.from({ length: holdings }, (_, index) => {
    const chainID = String(index % chains)
    const assetID: FullAssetID = `${chainID}/0x${index.toString(16).padStart(40, "0")}`
    const address = addresses[index % accounts]
    return { address, chainID, assetID, symbol: `T${index}` }
  })

  const seedStart = performance.now()
  for (let start = 0; start < held.length; start += 50) {
    const batch = held.slice(start, start + 50)
    const balances: BalanceMeasurement[] = batch.flatMap(
      ({ address, chainID, assetID, symbol }) =>
        balanceTimes.map((time, index) => ({
          key: balanceSeriesKeyFor(address, assetID),
          address,
          chainID,
          assetID,
          symbol,
          trusted: true,
          retrievedAt: time,
          value: 1 + (index % 7),
          origin: "backfill" as const,
        })),
    )
    const prices: PriceMeasurement[] = batch.flatMap(({ assetID, symbol }) =>
      priceTimes.map((time, index) => ({
        assetID,
        symbol,
        time,
        value: 1 + (index % 11),
        origin: "backfill" as const,
      })),
    )
    // oxlint-disable-next-line no-await-in-loop
    await db.addBalanceMeasurements(balances)
    // oxlint-disable-next-line no-await-in-loop
    await db.savePriceMeasurements(prices)
  }
  const seedMs = Math.round(performance.now() - seedStart)

  // Value history only needs the service's database and the networks it
  // tracks; with none tracked, every balance series keeps the trust it was
  // recorded with. The other services are never called here.
  const chainService = { getTrackedNetworks: async () => [] }
  // oxlint-disable-next-line typescript/no-explicit-any, typescript/no-unsafe-type-assertion
  const service = new (IndexingService as any)(
    db,
    {},
    chainService,
  ) as IndexingService
  const chart = (span: number, query: Partial<{ chainIDs: string[] }> = {}) =>
    service.getValueHistory({
      addresses,
      from: now - span,
      to: now,
      samples: 120,
      ...query,
    })

  const results: Record<string, { ms: number; longestStallMs: number }> = {}
  // Warm up once, as a page would have loaded something already.
  await chart(30 * DAY)
  results["portfolio chart, 1 day"] = await measure(() => chart(DAY))
  results["portfolio chart, 1 month"] = await measure(() => chart(30 * DAY))
  results["portfolio chart, 1 year"] = await measure(() => chart(365 * DAY))
  results["one chain's chart, 1 month"] = await measure(() =>
    chart(30 * DAY, { chainIDs: ["0"] }),
  )
  results["live balance report, every holding"] = await measure(() =>
    db.addLiveBalanceMeasurements(
      held.map(({ address, chainID, assetID, symbol }, index) => ({
        key: balanceSeriesKeyFor(address, assetID),
        address,
        chainID,
        assetID,
        symbol,
        trusted: true,
        retrievedAt: now + MINUTE,
        value: 100 + index,
        origin: "live" as const,
      })),
    ),
  )
  results["live prices, every asset"] = await measure(() =>
    db.savePriceMeasurements(
      held.map(({ assetID, symbol }) => ({
        assetID,
        symbol,
        time: now + MINUTE,
        value: 5,
        origin: "live" as const,
      })),
    ),
  )
  results["backfill tick reads"] = await measure(async () => {
    const all = await db.getBalanceSeries(addresses)
    await db.getPriceSeries(all.map(({ assetID }) => assetID))
  })
  results.compaction = await measure(() => db.compactHistory(now + 2 * DAY))

  db.close()
  return { holdings, accounts, chains, seedMs, results }
}

// The runner calls this through the page.
Object.assign(globalThis, { runHistoryBenchmark: run })
