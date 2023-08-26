import { browser, startMain } from "@tallyho/tally-background"
import {
  FeatureFlags,
  isEnabled,
  RuntimeFlag,
} from "@tallyho/tally-background/features"
import { ONBOARDING_ROOT } from "@tallyho/tally-ui/pages/Onboarding/Tabbed/Routes"

browser.runtime.onInstalled.addListener((obj) => {
  if (obj.reason === "install") {
    const url = browser.runtime.getURL(ONBOARDING_ROOT)
    browser.tabs.create({ url })
  }
  /**
   * Runtime feature flags should be clean from Local Storage if the build has change and SWITCH_RUNTIME_FLAGS is off.
   * If SWITCH_RUNTIME_FLAGS is on then it should keep the previous feature flags settings.
   */
  if (
    obj.reason === "update" &&
    !isEnabled(FeatureFlags.SWITCH_RUNTIME_FLAGS)
  ) {
    Object.keys(RuntimeFlag).forEach((flagName) =>
      localStorage.removeItem(flagName),
    )
  }
})

startMain()
