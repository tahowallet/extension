import { browser, Alarms } from "webextension-polyfill-ts"
import { handleAlarm as handleTokenAlarm } from "./tokens"
import { handleAlarm as handlePriceAlarm } from "./prices"

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

// TODO export subscription mechanism for token balances, only allow async functions
// TODO export subscription mech for price changes
