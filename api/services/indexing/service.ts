import { browser, Alarms } from "webextension-polyfill-ts"
import Emittery from "emittery"

import {
  AccountBalance,
  AccountNetwork,
  CoinGeckoAsset,
  FungibleAsset,
  Network,
  PricePoint,
  SmartContractFungibleAsset,
} from "../../types"
import { getBalances as getTokenBalances } from "../../lib/erc20"
import { getPrices } from "../../lib/prices"
import {
  fetchAndValidateTokenList,
  networkAssetsFromLists,
} from "../../lib/tokenList"
import { BTC, ETH, FIAT_CURRENCIES } from "../../constants"
import PreferenceService from "../preferences/service"
import ChainService from "../chain/service"
import { Service } from ".."
import { getOrCreateDB, IndexingDatabase } from "./db"

interface AlarmSchedule {
  when?: number
  delayInMinutes?: number
  periodInMinutes?: number
}

interface Events {
  accountBalance: AccountBalance
  price: PricePoint
  assets: SmartContractFungibleAsset[]
}

/*
 * IndexingService is responsible for pulling and maintaining all application-
 * level "indexing" data — things like fungible token balances and NFTs, as well
 * as more abstract application concepts like governance proposals.
 *
 * Today, the service periodically polls for price and token balance
 * changes for all tracked tokens and accounts, as well as up to date
 * token metadata. Relevant prices and balances are emitted as events.
 */
export default class IndexingService implements Service<Events> {
  readonly schedules: { [alarmName: string]: AlarmSchedule }

  readonly emitter: Emittery<Events>

  private db: IndexingDatabase | null

  private preferenceService: Promise<PreferenceService>

  private chainService: Promise<ChainService>

  /*
   * Create a new IndexingService. The service isn't initialized until
   * startService() is called and resolved.
   *
   * @param schedules - Data polling schedules, used to create browser alarms.
   * @param preferenceService - Required for token metadata and currency
   *        preferences.
   */
  constructor(
    schedules: { [alarmName: string]: AlarmSchedule },
    preferenceService: Promise<PreferenceService>,
    chainService: Promise<ChainService>
  ) {
    this.db = null
    this.emitter = new Emittery<Events>()
    this.schedules = schedules
    this.preferenceService = preferenceService
    this.chainService = chainService
  }

  /*
   * Initialize the IndexingService, setting up the database and all browser
   * alarms.
   */
  async startService(): Promise<void> {
    this.db = await getOrCreateDB()

    Object.entries(this.schedules).forEach(([name, schedule]) => {
      browser.alarms.create(name, schedule)
    })
    browser.alarms.onAlarm.addListener((alarm: Alarms.Alarm) => {
      if (alarm.name === "tokens") {
        this.handleTokenAlarm()
      } else if (alarm.name === "prices") {
        this.handlePriceAlarm()
      }
    })

    this.connectChainServiceEvents()
    await this.fetchAndCacheTokenLists()
  }

  async stopService(): Promise<void> {
    Object.entries(this.schedules).forEach(([name]) => {
      browser.alarms.clear(name)
    })
  }

  async getTokensToTrack(): Promise<SmartContractFungibleAsset[]> {
    return this.db.getTokensToTrack()
  }

  async addTokenToTrack(asset: SmartContractFungibleAsset): Promise<void> {
    return this.db.addTokenToTrack(asset)
  }

  async getLatestAccountBalance(
    account: string,
    network: Network,
    asset: FungibleAsset
  ): Promise<AccountBalance> {
    return this.db.getLatestAccountBalance(account, network, asset)
  }

  async getCachedNetworkAssets(): Promise<SmartContractFungibleAsset[]> {
    const tokenListPrefs = await (
      await this.preferenceService
    ).getTokenListPreferences()
    const tokenLists = await this.db.getLatestTokenLists(tokenListPrefs.urls)
    return networkAssetsFromLists(tokenLists)
  }

  /* *****************
   * PRIVATE METHODS *
   ******************* */

  private async connectChainServiceEvents(): Promise<void> {
    const chain = await this.chainService

    // listen for alchemyAssetTransfers, and if we find them, track those tokens
    // TODO update for NFTs
    chain.emitter.on(
      "alchemyAssetTransfers",
      async ([accountNetwork, assetTransfers]) => {
        assetTransfers
          .filter((t) => t.category === "token" && t.erc721TokenId === null)
          .forEach((transfer) => {
            if ("rawContract" in transfer) {
              this.addTokenToTrackByContract(
                accountNetwork,
                transfer.rawContract.address,
                transfer.rawContract.decimals
              )
            } else {
              console.warn(
                `Alchemy token transfer missing contract metadata ${transfer}`
              )
            }
          })
      }
    )
  }

  /*
   * Add an asset to track to a particular account and network, specified by the
   * contract address and optional decimals.
   *
   * If the asset has already been cached, use that. Otherwise, infer asset
   * details from the contract and outside services.
   *
   * @param accountNetwork the account and network on which this asset should
   *        be tracked
   * @param contractAddress the address of the token contract on this network
   * @param decimals optionally include the number of decimals tracked by a
   *        fungible asset. Useful in case this asset isn't found in existing
   *        metadata.
   */
  private async addTokenToTrackByContract(
    accountNetwork: AccountNetwork,
    contractAddress: string,
    decimals?: number
  ): Promise<void> {
    const knownAssets = await this.getCachedNetworkAssets()
    const found = knownAssets.find(
      (asset) =>
        asset.homeNetwork.name === accountNetwork.network.name &&
        asset.contractAddress === contractAddress
    )
    if (found) {
      this.addTokenToTrack(found)
    } else {
      const customAsset = await this.db.getCustomAssetByAddressAndNetwork(
        accountNetwork.network,
        contractAddress
      )
      if (customAsset) {
        this.addTokenToTrack(customAsset)
      } else {
        // TODO kick off metadata inference via a contract read + perhaps a CoinGecko lookup?
      }
    }
  }

  private async handlePriceAlarm(): Promise<void> {
    // ETH and BTC vs major currencies
    const pricePoints = await getPrices(
      [BTC, ETH] as CoinGeckoAsset[],
      FIAT_CURRENCIES
    )

    // kick off db writes and event emission, don't wait for the promises to
    // settle
    pricePoints.forEach((pricePoint) => {
      this.emitter.emit("price", pricePoint)
      this.db.savePriceMeasurement(pricePoint, Date.now(), "coingecko")
    })

    // TODO get the prices of all tokens to track and save them
  }

  private async fetchAndCacheTokenLists(): Promise<void> {
    const tokenListPrefs = await (
      await this.preferenceService
    ).getTokenListPreferences()
    // load each token list in preferences
    await Promise.allSettled(
      tokenListPrefs.urls.map(async (url) => {
        const cachedList = await this.db.getLatestTokenList(url)
        if (!cachedList) {
          try {
            const newListRef = await fetchAndValidateTokenList(url)
            await this.db.saveTokenList(url, newListRef.tokenList)
          } catch (err) {
            console.error(
              `Error fetching, validating, and saving token list ${url}`
            )
          }
        }
        this.emitter.emit("assets", await this.getCachedNetworkAssets())
      })
    )

    // TODO if tokenListPrefs.autoUpdate is true, pull the latest and update if
    // the version has gone up
  }

  private async handleTokenAlarm(): Promise<void> {
    // no need to block here, as the first fetch blocks the entire service init
    this.fetchAndCacheTokenLists()

    const tokensToTrack = await this.db.getTokensToTrack()
    // TODO only supports Ethereum mainnet, doesn't support multi-network assets
    // like USDC or CREATE2-based contracts on L1/L2
    const erc20TokensToTrack = tokensToTrack.filter(
      (t) => t.homeNetwork.chainID === "1"
    )

    const chainService = await this.chainService
    // wait on balances being written to the db, don't wait on event emission
    await Promise.allSettled(
      (
        await chainService.getAccountsToTrack()
      ).map(async ({ account }) => {
        // TODO hardcoded to Ethereum
        const balances = await getTokenBalances(
          chainService.pollingProviders.ethereum,
          erc20TokensToTrack,
          account
        )
        balances.forEach((ab) => this.emitter.emit("accountBalance", ab))
        await this.db.balances.bulkAdd(balances)
      })
    )
  }
}
