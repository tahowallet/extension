import { browser, Alarms } from "webextension-polyfill-ts"

import {
  AccountBalance,
  CoinGeckoAsset,
  FungibleAsset,
  Network,
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

export default class IndexingService implements Service {
  readonly schedules: { [alarmName: string]: AlarmSchedule }

  private db: IndexingDatabase | null

  private preferenceService: PreferenceService

  constructor(
    schedules: { [alarmName: string]: AlarmSchedule },
    preferenceService: PreferenceService
  ) {
    this.db = null
    this.schedules = schedules
    this.preferenceService = preferenceService
  }

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

  async getCachedNetworkAssets() {
    const tokenListPrefs =
      await this.preferenceService.getTokenListPreferences()
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
    // kick off db writes, don't wait for the promises to settle
    pricePoints.forEach((pricePoint) =>
      this.db.savePriceMeasurement(pricePoint, Date.now(), "coingecko")
    )

    // TODO get the prices of all tokens to track and save them
  }

  private async handleTokenAlarm(): Promise<void> {
    const tokenListPrefs =
      await this.preferenceService.getTokenListPreferences()
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

    await Promise.all(
      (
        await this.db.getAccountsToTrack()
      ).map(async ({ account }) => {
        const balances = await getTokenBalances(erc20TokensToTrack, account)
        await this.db.balances.bulkAdd(balances)
      })
    )
  }

  // TODO expose subscription mechanism for token balances, only allow async functions
  // TODO expose subscription mech for price changes
}
