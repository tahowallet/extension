import { IDBFactory } from "fake-indexeddb"
import { DAY, ETH } from "../../../constants"
import {
  createAccountBalance,
  createPricePoint,
} from "../../../tests/factories"
import { IndexingDatabase, getOrCreateDb } from "../db"

const NOW = Date.UTC(2026, 10, 3, 12)

describe("IndexingDatabase.pruneMeasurements", () => {
  let db: IndexingDatabase

  beforeEach(async () => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = await getOrCreateDb()

    const balances = Array.from({ length: 30 }, (_, index) =>
      createAccountBalance({
        // Twenty balances are old enough to drop, and ten are recent.
        retrievedAt: NOW - (index < 20 ? 10 * DAY : DAY) - index,
      }),
    )
    await db.addBalances(balances)
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        db.savePriceMeasurement(
          // Price points carry milliseconds, as the wallet's sources stamp
          // them with Date.now().
          {
            ...createPricePoint(ETH),
            time: NOW - (index < 8 ? 10 : 1) * DAY,
          },
          NOW,
          "coingecko",
        ),
      ),
    )
  })

  it("drops only measurements older than the cutoff, in batches", async () => {
    const dropped = await db.pruneMeasurements(NOW - 7 * DAY, {
      batchSize: 3,
      pause: 0,
    })
    expect(dropped).toBe(28)

    // Another pass finds nothing left to drop.
    expect(await db.pruneMeasurements(NOW - 7 * DAY, { pause: 0 })).toBe(0)
  })

  it("stops at its row limit and leaves the rest for later", async () => {
    expect(
      await db.pruneMeasurements(NOW - 7 * DAY, {
        batchSize: 4,
        maxRows: 10,
        pause: 0,
      }),
    ).toBe(10)
    expect(await db.pruneMeasurements(NOW - 7 * DAY, { pause: 0 })).toBe(18)
  })
})
