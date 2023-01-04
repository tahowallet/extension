import { browser, startMain } from "@tallyho/tally-background"
import {
  FeatureFlags,
  isEnabled,
  RuntimeFlag,
} from "@tallyho/tally-background/features"
import logger, { LoggerEnvironment } from "@tallyho/tally-background/lib/logger"

logger.init(LoggerEnvironment.bg)

browser.runtime.onInstalled.addListener((obj) => {
  if (
    obj.reason === "install" &&
    isEnabled(FeatureFlags.SUPPORT_TABBED_ONBOARDING)
  ) {
    const url = browser.runtime.getURL("tab.html#onboarding")
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
      localStorage.removeItem(flagName)
    )
  }
})

startMain()
