import { fetchJson } from "@ethersproject/web"
import sinon, { SinonStub } from "sinon"
import IndexingService from ".."
import { ETHEREUM, OPTIMISM } from "../../../constants"
import {
  createAddressOnNetwork,
  createChainService,
  createIndexingService,
  createPreferenceService,
  createSmartContractAsset,
} from "../../../tests/factories"
import ChainService from "../../chain"
import PreferenceService from "../../preferences"
import { getOrCreateDb as getIndexingDB } from "../db"

type MethodSpy<T extends (...args: unknown[]) => unknown> = jest.SpyInstance<
  ReturnType<T>,
  Parameters<T>
>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPrivateMethodSpy = <T extends (...args: any[]) => unknown>(
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
    sandbox
      .stub(chainService, "getTrackedNetworks")
      .resolves([ETHEREUM, OPTIMISM])

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
    const customAsset = createSmartContractAsset({
      symbol: "USDC",
    })

    it("should initialize cache with base assets, custom assets and tokenlists stored in the db", async () => {
      const cacheSpy = jest.spyOn(indexingService, "cacheAssetsForNetwork")

      const indexingDb = await getIndexingDB()

      await indexingDb.addOrUpdateCustomAsset(customAsset)

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
        ).toEqual(["ETH", customAsset.symbol, "TEST"])
      })

      delay.resolve(undefined)
    })

    it("should update cache once token lists load", async () => {
      const spy = getPrivateMethodSpy<
        IndexingService["fetchAndCacheTokenLists"]
      >(indexingService, "fetchAndCacheTokenLists")

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
        expect(cacheSpy).toHaveBeenCalledTimes(
          chainService.supportedNetworks.length + 2
        )

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

      await indexingService.addOrUpdateCustomAsset(customAsset)

      expect(cacheSpy).toHaveBeenCalled()

      expect(
        indexingService.getCachedAssets(ETHEREUM).map((assets) => assets.symbol)
      ).toEqual(["ETH", customAsset.symbol, "TEST"])
    })

    // Check that we're using proper token ids for built in network assets
    // TODO: Remove once we add an e2e test for balances
    it("should query builtin network asset prices", async () => {
      const indexingDb = await getIndexingDB()

      const smartContractAsset = createSmartContractAsset()

      await indexingDb.saveTokenList(
        "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
        tokenList
      )

      await indexingDb.addAssetToTrack(smartContractAsset)

      const spy = getPrivateMethodSpy<IndexingService["handlePriceAlarm"]>(
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

      expect(
        fetchJsonStub
          .getCalls()
          .toString()
          .match(/ethereum,matic-network,rootstock,avalanche-2,binancecoin/i)
      ).toBeTruthy()
    })
  })

  describe("loading account balances", () => {
    it("should query erc20 balances without specifying token addresses when provider supports alchemy", async () => {
      const indexingDb = await getIndexingDB()

      const smartContractAsset = createSmartContractAsset()

      await indexingDb.saveTokenList(
        "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
        tokenList
      )

      await indexingService.addOrUpdateCustomAsset(smartContractAsset)
      await indexingDb.addAssetToTrack(smartContractAsset)

      // Skip loading prices at service init
      getPrivateMethodSpy<IndexingService["handlePriceAlarm"]>(
        indexingService,
        "handlePriceAlarm"
      ).mockResolvedValue(Promise.resolve())

      await Promise.all([
        chainService.startService(),
        indexingService.startService(),
      ])

      const account = createAddressOnNetwork()

      const provider = chainService.providerForNetworkOrThrow(ETHEREUM)
      provider.supportsAlchemy = true

      jest
        .spyOn(chainService, "getAccountsToTrack")
        .mockResolvedValue([account])

      // We don't care about the return value for these calls
      const baseBalanceSpy = jest
        .spyOn(chainService, "getLatestBaseAccountBalance")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(() => Promise.resolve({} as any))

      const tokenBalanceSpy = getPrivateMethodSpy<
        IndexingService["retrieveTokenBalances"]
      >(indexingService, "retrieveTokenBalances").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => Promise.resolve({}) as any
      )

      // eslint-disable-next-line @typescript-eslint/dot-notation
      await indexingService["loadAccountBalances"]()

      expect(baseBalanceSpy).toHaveBeenCalledWith(account)
      expect(tokenBalanceSpy).toHaveBeenCalledWith(account, [])
    })

    it("should query erc20 balances specifying token addresses when provider doesn't support alchemy", async () => {
      const indexingDb = await getIndexingDB()

      const smartContractAsset = createSmartContractAsset()

      await indexingDb.saveTokenList(
        "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
        tokenList
      )

      await indexingService.addOrUpdateCustomAsset(smartContractAsset)
      await indexingDb.addAssetToTrack(smartContractAsset)

      // Skip loading prices at service init
      getPrivateMethodSpy<IndexingService["handlePriceAlarm"]>(
        indexingService,
        "handlePriceAlarm"
      ).mockResolvedValue(Promise.resolve())

      await Promise.all([
        chainService.startService(),
        indexingService.startService(),
      ])

      const account = createAddressOnNetwork()

      const provider = chainService.providerForNetworkOrThrow(ETHEREUM)
      provider.supportsAlchemy = false

      jest
        .spyOn(chainService, "getAccountsToTrack")
        .mockResolvedValue([account])

      // We don't care about the return value for these calls
      const baseBalanceSpy = jest
        .spyOn(chainService, "getLatestBaseAccountBalance")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(() => Promise.resolve({} as any))

      const tokenBalanceSpy = getPrivateMethodSpy<
        IndexingService["retrieveTokenBalances"]
      >(indexingService, "retrieveTokenBalances").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => Promise.resolve({}) as any
      )

      await indexingService.cacheAssetsForNetwork(ETHEREUM)

      // eslint-disable-next-line @typescript-eslint/dot-notation
      await indexingService["loadAccountBalances"]()

      expect(baseBalanceSpy).toHaveBeenCalledWith(account)
      expect(tokenBalanceSpy).toHaveBeenCalledWith(
        account,
        expect.arrayContaining([
          expect.objectContaining({ symbol: "TEST" }),
          expect.objectContaining({ symbol: smartContractAsset.symbol }),
        ])
      )
    })
  })
})
