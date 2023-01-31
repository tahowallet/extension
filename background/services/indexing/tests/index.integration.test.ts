import { fetchJson } from "@ethersproject/web"
import sinon, { SinonStub } from "sinon"
import * as libPrices from "../../../lib/prices"
import IndexingService from ".."
import { SmartContractFungibleAsset } from "../../../assets"
import { ETHEREUM, OPTIMISM } from "../../../constants"
import {
  createChainService,
  createIndexingService,
  createPreferenceService,
} from "../../../tests/factories"
import ChainService from "../../chain"
import PreferenceService from "../../preferences"
import { getOrCreateDb as getIndexingDB } from "../db"

type MethodSpy<T extends (...args: unknown[]) => unknown> = jest.SpyInstance<
  ReturnType<T>,
  Parameters<T>
>

const getMethodSpy = <T extends (...args: unknown[]) => unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object: any,
  property: string
) => {
  return jest.spyOn(object, property) as MethodSpy<T>
}

const fetchJsonStub: SinonStub<
  Parameters<typeof fetchJson>,
  ReturnType<typeof fetchJson>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = fetchJson as any

// Default to an empty response
beforeEach(() => fetchJsonStub.callsFake(async () => ({})))

afterEach(() => fetchJsonStub.resetBehavior())

describe("IndexingService", () => {
  const sandbox = sinon.createSandbox()
  let indexingService: IndexingService
  let chainService: ChainService
  let preferenceService: PreferenceService

  beforeEach(async () => {
    fetchJsonStub
      .withArgs(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network,rootstock,avalanche-2,binancecoin&include_last_updated_at=true&vs_currencies=usd"
      )
      .resolves({
        "matic-network": { usd: 1.088, last_updated_at: 1675123143 },
        ethereum: { usd: 1569.14, last_updated_at: 1675123142 },
        "avalanche-2": { usd: 19.76, last_updated_at: 1675123166 },
        binancecoin: { usd: 307.31, last_updated_at: 1675123138 },
        rootstock: { usd: 22837, last_updated_at: 1675123110 },
      })

    preferenceService = await createPreferenceService()

    sandbox.stub(preferenceService, "getTokenListPreferences").resolves({
      autoUpdate: false,
      urls: ["https://gateway.ipfs.io/ipns/tokens.uniswap.org"],
    })

    chainService = await createChainService({
      preferenceService: Promise.resolve(preferenceService),
    })

    sandbox.stub(chainService, "supportedNetworks").value([ETHEREUM, OPTIMISM])
    // eslint-disable-next-line @typescript-eslint/dot-notation
    chainService["trackedNetworks"] = [ETHEREUM, OPTIMISM]

    indexedDB = new IDBFactory()

    indexingService = await createIndexingService({
      chainService: Promise.resolve(chainService),
      preferenceService: Promise.resolve(preferenceService),
      dexieOptions: { indexedDB },
    })
  })

  afterEach(async () => {
    // Always try to stop services, ignore failed promises where the service
    // was never started.
    await Promise.allSettled([
      chainService.stopService(),
      indexingService.stopService(),
    ])

    sandbox.restore()
  })

  describe("service start", () => {
    const tokenList = {
      name: "Test",
      timestamp: "2022-05-12T18:15:59+00:00",
      version: {
        major: 1,
        minor: 169,
        patch: 0,
      },
      tokens: [
        {
          chainId: 1,
          address: "0x0000000000000000000000000000000000000000",
          name: "Some Token",
          decimals: 18,
          symbol: "TEST",
          logoURI: "/logo.svg",
          tags: ["earn"],
        },
      ],
    }

    const customAsset: SmartContractFungibleAsset = {
      metadata: {
        tokenLists: [
          {
            url: "https://bridge.arbitrum.io/token-list-42161.json",
            name: "Arb Whitelist Era",
            logoURL: "ipfs://QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y",
          },
        ],
      },
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      homeNetwork: ETHEREUM,
      contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    }

    it("should initialize cache with base assets, custom assets and tokenlists stored in the db", async () => {
      const cacheSpy = jest.spyOn(indexingService, "cacheAssetsForNetwork")

      const indexingDb = await getIndexingDB()

      await indexingDb.addCustomAsset(customAsset)

      await indexingDb.saveTokenList(
        "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
        tokenList
      )

      const delay = sinon.promise<void>()
      fetchJsonStub
        .withArgs({
          url: "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
          timeout: 10_000,
        })
        .returns(
          delay.then(() => ({
            ...tokenList,
            tokens: [
              {
                chainId: 1,
                address: "0x1000000000000000000000000000000000000000",
                name: "Some Token",
                decimals: 18,
                symbol: "DOGGO",
                logoURI: "/logo.svg",
                tags: ["earn"],
              },
            ],
          }))
        )

      await Promise.all([
        chainService.startService(),
        indexingService.startService(),
      ])

      await indexingService.emitter.once("assets").then(() => {
        expect(cacheSpy).toHaveBeenCalled()

        expect(
          indexingService
            .getCachedAssets(ETHEREUM)
            .map((assets) => assets.symbol)
        ).toEqual(["ETH", "USDC", "TEST"])
      })

      delay.resolve(undefined)
    })

    it("should update cache once token lists load", async () => {
      const spy = getMethodSpy<IndexingService["fetchAndCacheTokenLists"]>(
        indexingService,
        "fetchAndCacheTokenLists"
      )

      sandbox
        .stub(chainService, "supportedNetworks")
        .value([ETHEREUM, OPTIMISM])
      // sandbox.stub(chainService, "trackedNetworks").value([ETHEREUM, OPTIMISM])
      const cacheSpy = jest.spyOn(indexingService, "cacheAssetsForNetwork")

      const delay = sinon.promise<void>()

      fetchJsonStub
        .withArgs({
          url: "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
          timeout: 10_000,
        })
        .returns(delay.then(() => tokenList))

      await Promise.all([
        chainService.startService(),
        indexingService.startService(),
      ])

      await indexingService.emitter.once("assets").then(() => {
        // The order in which assets are emitted is non-deterministic
        // since the `emit` function gets called as part of an unawaited
        // series of promises (trackedNetworks.forEach in "internalStartService")
        // Since we expect two asset emissions and we don't know which will
        // be emitted first - we make our test assertions after the second
        // emission in the event handler below this one.
      })

      delay.resolve(undefined)
      await spy.mock.results[0].value

      await indexingService.emitter.once("assets").then(() => {
        /**
         * Caches assets for every tracked network at service start and
         * for every supported network after tokenlist load
         */
        expect(cacheSpy).toHaveBeenCalledTimes(4)

        expect(
          indexingService.getCachedAssets(ETHEREUM).map((asset) => asset.symbol)
        ).toEqual(["ETH", "TEST"])
      })
    })

    it("should update cache when adding a custom asset", async () => {
      const cacheSpy = jest.spyOn(indexingService, "cacheAssetsForNetwork")

      fetchJsonStub
        .withArgs({
          url: "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
          timeout: 10_000,
        })
        .resolves(tokenList)

      await Promise.all([
        chainService.startService(),
        indexingService.startService(),
      ])

      await indexingService.emitter.once("assets").then(() => {
        expect(
          indexingService
            .getCachedAssets(ETHEREUM)
            .map((assets) => assets.symbol)
        ).toEqual(["ETH", "TEST"])
      })

      await indexingService.addCustomAsset(customAsset)

      expect(cacheSpy).toHaveBeenCalled()

      expect(
        indexingService.getCachedAssets(ETHEREUM).map((assets) => assets.symbol)
      ).toEqual(["ETH", customAsset.symbol, "TEST"])
    })

    it("should not retrieve token prices for custom assets", async () => {
      const indexingDb = await getIndexingDB()

      const smartContractAsset: SmartContractFungibleAsset = {
        metadata: { tokenLists: [{ url: "random.cat", name: "random cat" }] },
        name: "Test Coin",
        symbol: "TEST",
        decimals: 6,
        homeNetwork: ETHEREUM,
        contractAddress: "0x111111111117dc0aa78b770fa6a738034120c302",
      }
      await indexingDb.addCustomAsset(customAsset)
      await indexingDb.saveTokenList(
        "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
        tokenList
      )

      await indexingDb.addAssetToTrack(customAsset)
      await indexingDb.addAssetToTrack(smartContractAsset)

      const getTokenPricesSpy = jest.spyOn(libPrices, "getTokenPrices")

      fetchJsonStub
        .withArgs(
          "https://api.coingecko.com/api/v3/simple/token_price/ethereum?vs_currencies=USD&include_last_updated_at=true&contract_addresses=0x111111111117dc0aa78b770fa6a738034120c302"
        )
        .resolves({
          "0x111111111117dc0aa78b770fa6a738034120c302": {
            usd: 0.511675,
            last_updated_at: 1675140863,
          },
        })

      const spy = getMethodSpy<IndexingService["handlePriceAlarm"]>(
        indexingService,
        "handlePriceAlarm"
      )

      await Promise.all([
        chainService.startService(),
        indexingService.startService(),
      ])

      await indexingService.emitter.once("assets")

      expect(spy).toHaveBeenCalled()

      await spy.mock.results[0].value
      expect(getTokenPricesSpy).toHaveBeenCalledWith(
        ["0x111111111117dc0aa78b770fa6a738034120c302"],
        { name: "United States Dollar", symbol: "USD", decimals: 10 },
        ETHEREUM
      )
    })
  })
})
