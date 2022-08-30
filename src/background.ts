import browser from "webextension-polyfill"
import { startMain } from "@tallyho/tally-background"

browser.runtime.onInstalled.addListener((obj) => {
  if (obj.reason === "install") {
    const url = browser.runtime.getURL("onboarding.html")
    browser.tabs.create({ url })
  }
})

startMain()
