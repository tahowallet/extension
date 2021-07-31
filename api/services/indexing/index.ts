import { browser } from "webextension-polyfill-ts"

const SCHEDULES = {
  tokenBalances: {
    delayInMinutes: 1,
    periodInMinutes: 30,
  },
  prices: {
    delayInMinutes: 1,
    periodInMinutes: 10,
  },
}

export async function start(): Promise<void> {
  Object.entries(SCHEDULES).forEach(([name, schedule]) => {
    browser.alarms.create(name, schedule)
  })
}

export async function stop(): Promise<void> {
  Object.entries(SCHEDULES).forEach(([name]) => {
    browser.alarms.clear(name)
  })
}

// TODO export subscription mechanism for token balances, only allow async functions
// TODO export subscription mech for price changes
