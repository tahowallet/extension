import { browser, Alarms } from "webextension-polyfill-ts"
import { handleAlarm as handleTokenAlarm } from "./tokens"
import { handleAlarm as handlePriceAlarm } from "./prices"
import { getOrCreateDB } from "./db"

const SCHEDULES = {
  tokens: {
    delayInMinutes: 1,
    periodInMinutes: 30,
  },
  prices: {
    delayInMinutes: 1,
    periodInMinutes: 10,
  },
}

async function alarmHandler(alarm: Alarms.Alarm): Promise<void> {
  if (alarm.name === "tokens") {
    handleTokenAlarm()
  } else if (alarm.name === "prices") {
    handlePriceAlarm()
  }
}

export async function startService(): Promise<void> {
  const db = await getOrCreateDB()

  Object.entries(SCHEDULES).forEach(([name, schedule]) => {
    browser.alarms.create(name, schedule)
  })
  browser.alarms.onAlarm.addListener(alarmHandler)
}

export async function stopService(): Promise<void> {
  Object.entries(SCHEDULES).forEach(([name]) => {
    browser.alarms.clear(name)
  })
  browser.alarms.onAlarm.removeListener(alarmHandler)
}

export { getCachedNetworkAssets } from "./tokens"

// TODO export subscription mechanism for token balances, only allow async functions
// TODO export subscription mech for price changes
