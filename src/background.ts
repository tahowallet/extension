import { browser, startMain } from "@tallyho/tally-background"
import {
  FeatureFlagTypes,
  isEnabled,
  RuntimeFlag,
} from "@tallyho/tally-background/features"

browser.runtime.onInstalled.addListener((obj) => {
  if (
    obj.reason === "install" &&
    isEnabled(FeatureFlagTypes.SUPPORT_TABBED_ONBOARDING)
  ) {
    const url = browser.runtime.getURL("tab.html#onboarding")
    browser.tabs.create({ url })
  }

  if (
    obj.reason === "update" &&
    !isEnabled(FeatureFlagTypes.SWITCH_RUNTIME_FLAGS) &&
    !!Object.keys(RuntimeFlag).find(
      (flagName) => localStorage.getItem(flagName) !== null
    )
  ) {
    Object.keys(RuntimeFlag).forEach((flagName) =>
      localStorage.removeItem(flagName)
    )
  }
})

startMain()
