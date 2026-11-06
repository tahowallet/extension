import { IDBFactory } from "fake-indexeddb"
import { DAY, ETHEREUM, HOUR, SEPOLIA } from "../../../constants"
import type { AnyAsset } from "../../../assets"
import type { EVMNetwork } from "../../../networks"
import type { FullAssetID } from "../../../redux-slices/utils/asset-utils"
import { IndexingDatabase } from "../db"
import { balanceSeriesKeyFor } from "../history/records"
import { trustResolverFor, valueHistory } from "../history/value-history"

const NOW = Date.UTC(2026, 10, 5, 12)
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const TOKEN = "0x1111111111111111111111111111111111111111"

describe("valueHistory", () => {
  let db: IndexingDatabase

  beforeEach(async () => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = new IndexingDatabase()

    const balance = (
      chainID: string,
      assetID: FullAssetID,
      symbol: string,
    ) => ({
      key: balanceSeriesKeyFor(ADDRESS, assetID),
      address: ADDRESS,
      chainID,
      assetID,
      symbol,
      // Recorded as untrusted, as a balance report's copy of an asset can
      // lack the metadata that makes it trusted.
      trusted: false,
      retrievedAt: NOW - DAY,
      value: 2,
      origin: "live" as const,
    })
    await db.addBalanceMeasurements([
      balance(ETHEREUM.chainID, `${ETHEREUM.chainID}/${TOKEN}`, "TKN"),
      balance(SEPOLIA.chainID, `${SEPOLIA.chainID}/base`, "ETH"),
    ])
    await db.savePriceMeasurements(
      [
        {
          assetID: `${ETHEREUM.chainID}/${TOKEN}` as const,
          symbol: "TKN",
          value: 10,
        },
        {
          assetID: `${ETHEREUM.chainID}/base` as const,
          symbol: "ETH",
          value: 3000,
        },
      ].map((price) => ({
        ...price,
        time: NOW - DAY,
        origin: "live" as const,
      })),
    )
  })

  /**
   * Returns the latest charted value, with assets trusted as the wallet would
   * trust them given `cachedAssets` on Ethereum and nothing loaded on Sepolia.
   */
  const latestValue = async (cachedAssets: AnyAsset[], chainIDs?: string[]) => {
    const { points } = await valueHistory(
      {
        addresses: [ADDRESS],
        chainIDs,
        from: NOW - HOUR,
        to: NOW,
        samples: 2,
      },
      {
        db,
        trustResolver: async () =>
          trustResolverFor([ETHEREUM, SEPOLIA], (network: EVMNetwork) =>
            network.chainID === ETHEREUM.chainID ? cachedAssets : [],
          ),
        isBackfillPending: () => false,
      },
    )
    return points[points.length - 1]?.value
  }

  it("counts balances the wallet trusts now, whatever was recorded", async () => {
    const value = await latestValue([
      {
        contractAddress: TOKEN,
        homeNetwork: ETHEREUM,
        decimals: 18,
        name: "Token",
        symbol: "TKN",
        metadata: { tokenLists: [{ name: "List", url: "https://list" }] },
      },
    ])

    // The token counts, while Sepolia's ETH is left out of the total.
    expect(value).toBe(20)
  })

  it("leaves out balances the wallet doesn't trust", async () => {
    const value = await latestValue([
      {
        contractAddress: TOKEN,
        homeNetwork: ETHEREUM,
        decimals: 18,
        name: "Token",
        symbol: "TKN",
      },
    ])

    expect(value).toBeUndefined()
  })

  it("charts a test network when asked for it", async () => {
    // Sepolia's ETH is valued by symbol, at mainnet ETH's price.
    expect(await latestValue([], [SEPOLIA.chainID])).toBe(6000)
  })
})
