import { browser, Alarms } from "webextension-polyfill-ts"

import { FungibleAsset, Network, SmartContractFungibleAsset } from "../../types"
import PreferenceService from "../preferences/service"
import { Service } from ".."
import { handleAlarm as handleTokenAlarm } from "./tokens"
import { handleAlarm as handlePriceAlarm } from "./prices"
import { getOrCreateDB, getDB, AccountNetwork, IndexingDatabase } from "./db"

function getAlarmHandler(preferenceService: PreferenceService) {
  async function alarmHandler(alarm: Alarms.Alarm): Promise<void> {
    if (alarm.name === "tokens") {
      handleTokenAlarm(preferenceService)
    } else if (alarm.name === "prices") {
      handlePriceAlarm()
    }
  }
  return alarmHandler
}

interface AlarmSchedule {
  when?: number
  delayInMinutes?: number
  periodInMinutes?: number
}

export default class IndexingService implements Service {
  db: IndexingDatabase | null

  schedules: { [alarmName: string]: AlarmSchedule }

  preferenceService: PreferenceService

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
    browser.alarms.onAlarm.addListener(getAlarmHandler(this.preferenceService))
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
  ) {
    return this.db.getLatestAccountBalance(account, network, asset)
  }

  // TODO expose subscription mechanism for token balances, only allow async functions
  // TODO expose subscription mech for price changes
}
