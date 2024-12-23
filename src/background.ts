import { browser, startRedux } from "@tallyho/tally-background"
import { SECOND } from "@tallyho/tally-background/constants"
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
    Object.keys(RuntimeFlag).forEach(
      (flagName) => "", // localStorage.removeItem(flagName),
    )
  }
})

startRedux()

// FIXME: Temporary workaround to prevent the service worker from being suspended
// This ensures we keep state updates persisted to local storage as the extension
// syncs chain data
// https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep_a_service_worker_alive_until_a_long-running_operation_is_finished
setInterval(() => {
  chrome.runtime.getPlatformInfo()
}, 25 * SECOND)
