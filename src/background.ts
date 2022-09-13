import { browser, startMain } from "@tallyho/tally-background"
import { SUPPORT_TABBED_ONBOARDING } from "@tallyho/tally-background/features"

browser.runtime.onInstalled.addListener((obj) => {
  if (obj.reason === "install" && SUPPORT_TABBED_ONBOARDING) {
    const url = browser.runtime.getURL("tab.html#onboarding")
    browser.tabs.create({ url })
  }
})

startMain()
