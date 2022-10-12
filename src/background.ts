import { browser, startMain } from "@tallyho/tally-background"
import { FeatureFlagTypes, isEnabled } from "@tallyho/tally-background/features"

browser.runtime.onInstalled.addListener((obj) => {
  if (
    obj.reason === "install" &&
    isEnabled(FeatureFlagTypes.SUPPORT_TABBED_ONBOARDING)
  ) {
    const url = browser.runtime.getURL("tab.html#onboarding")
    browser.tabs.create({ url })
  }
})

startMain()
