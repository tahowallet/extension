import { browser, Alarms } from "webextension-polyfill-ts"
import Emittery from "emittery"

import {
  AccountBalance,
  CoinGeckoAsset,
  FungibleAsset,
  Network,
  PricePoint,
  SmartContractFungibleAsset,
} from "../../types"
import PreferenceService from "../preferences/service"
import { getBalances as getTokenBalances } from "../../lib/erc20"
import { getPrices } from "../../lib/prices"
import {
  fetchAndValidateTokenList,
  networkAssetsFromLists,
} from "../../lib/tokenList"
import { BTC, ETH, FIAT_CURRENCIES } from "../../constants"
import { Service } from ".."
import { getOrCreateDB, AccountNetwork, IndexingDatabase } from "./db"

interface AlarmSchedule {
  when?: number
  delayInMinutes?: number
  periodInMinutes?: number
}

interface Events {
  price: PricePoint
  accountBalance: AccountBalance
}

/*
 *
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

  emitter: Emittery<Events>

  private db: IndexingDatabase | null

  private preferenceService: Promise<PreferenceService>

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
    preferenceService: Promise<PreferenceService>
  ) {
    this.db = null
    this.emitter = new Emittery<Events>()
    this.schedules = schedules
    this.preferenceService = preferenceService
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
  }

  async stopService(): Promise<void> {
    Object.entries(this.schedules).forEach(([name]) => {
      browser.alarms.clear(name)
    })
  }

  async getAccountsToTrack(): Promise<AccountNetwork[]> {
    return this.db.getAccountsToTrack()
  }

  async setAccountsToTrack(
    accountAndNetworks: AccountNetwork[]
  ): Promise<void> {
    return this.db.setAccountsToTrack(accountAndNetworks)
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

  private async handleTokenAlarm(): Promise<void> {
    const tokenListPrefs = await (
      await this.preferenceService
    ).getTokenListPreferences()
    // make sure each token list in preferences is loaded
    await Promise.all(
      tokenListPrefs.urls.map(async (url) => {
        const cachedList = await this.db.getLatestTokenList(url)
        if (!cachedList) {
          const newListRef = await fetchAndValidateTokenList(url)
          await this.db.saveTokenList(url, newListRef.tokenList)
        }
      })
    )

    // TODO if tokenListPrefs.autoUpdate is true, pull the latest and update if
    // the version has gone up

    const tokensToTrack = await this.db.getTokensToTrack()
    // TODO only supports Ethereum mainnet, doesn't support multi-network assets
    // like USDC or CREATE2-based contracts on L1/L2
    const erc20TokensToTrack = tokensToTrack.filter(
      (t) => t.homeNetwork.chainID === "1"
    )

    // wait on balances being written to the db, don't wait on event emission
    await Promise.allSettled(
      (
        await this.db.getAccountsToTrack()
      ).map(async ({ account }) => {
        const balances = await getTokenBalances(erc20TokensToTrack, account)
        balances.forEach((ab) => this.emitter.emit("accountBalance", ab))
        await this.db.balances.bulkAdd(balances)
      })
    )
  }
}
