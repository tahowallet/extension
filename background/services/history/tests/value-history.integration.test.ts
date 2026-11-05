import { IDBFactory } from "fake-indexeddb"
import { DAY, ETHEREUM, HOUR, SEPOLIA } from "../../../constants"
import type { AnyAsset } from "../../../assets"
import type { EVMNetwork } from "../../../networks"
import HistoryService from ".."
import { HistoryDatabase, holdingKeyFor } from "../db"

const NOW = Date.UTC(2026, 10, 5, 12)
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const TOKEN = "0x1111111111111111111111111111111111111111"

/** A history service over `db`, with just enough of the services it reads. */
function serviceFor(db: HistoryDatabase, cachedAssets: AnyAsset[]) {
  const chainService = {
    getTrackedNetworks: async () => [ETHEREUM, SEPOLIA],
  }
  const indexingService = {
    getCachedAssets: (network: EVMNetwork) =>
      network.chainID === ETHEREUM.chainID ? cachedAssets : [],
  }
  // The constructor is private, so tests cast past it to build the service
  // directly.
  // oxlint-disable-next-line typescript/no-explicit-any, typescript/no-unsafe-type-assertion
  return new (HistoryService as any)(
    db,
    chainService,
    indexingService,
  ) as HistoryService
}

describe("HistoryService.getValueHistory", () => {
  let db: HistoryDatabase

  beforeEach(async () => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = new HistoryDatabase()

    const holding = (chainID: string, assetID: string, symbol: string) => ({
      holdingKey: holdingKeyFor(ADDRESS, assetID),
      address: ADDRESS,
      chainID,
      assetID,
      symbol,
      // Recorded as untrusted, as a balance report's copy of an asset can
      // lack the metadata that makes it trusted.
      trusted: false,
      time: NOW - DAY,
      value: 2,
      source: "live" as const,
    })
    await db.addBalances([
      holding(ETHEREUM.chainID, `${ETHEREUM.chainID}/${TOKEN}`, "TKN"),
      holding(SEPOLIA.chainID, `${SEPOLIA.chainID}/base`, "ETH"),
    ])
    await db.addPrices(
      [
        { priceKey: `${ETHEREUM.chainID}/${TOKEN}`, symbol: "TKN", value: 10 },
        { priceKey: `${ETHEREUM.chainID}/base`, symbol: "ETH", value: 3000 },
      ].map((price) => ({
        ...price,
        time: NOW - DAY,
        source: "live" as const,
      })),
    )
  })

  const latestValue = async (service: HistoryService, chainIDs?: string[]) => {
    const { points } = await service.getValueHistory({
      addresses: [ADDRESS],
      chainIDs,
      from: NOW - HOUR,
      to: NOW,
      samples: 2,
    })
    return points[points.length - 1]?.value
  }

  it("counts holdings the wallet trusts now, whatever was recorded", async () => {
    const service = serviceFor(db, [
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
    expect(await latestValue(service)).toBe(20)
  })

  it("leaves out holdings the wallet doesn't trust", async () => {
    const service = serviceFor(db, [
      {
        contractAddress: TOKEN,
        homeNetwork: ETHEREUM,
        decimals: 18,
        name: "Token",
        symbol: "TKN",
      },
    ])

    expect(await latestValue(service)).toBeUndefined()
  })

  it("charts a test network when asked for it", async () => {
    const service = serviceFor(db, [])

    // Sepolia's ETH is valued by symbol, at mainnet ETH's price.
    expect(await latestValue(service, [SEPOLIA.chainID])).toBe(6000)
  })
})
