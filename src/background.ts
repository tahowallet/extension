import { browser, startRedux } from "@tallyho/tally-background"
import {
  FeatureFlags,
  isEnabled,
  RuntimeFlag,
} from "@tallyho/tally-background/features"
import ReduxService from "@tallyho/tally-background/services/redux"
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
      // Holding until the approach can be reworked around browser.storage.local.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (flagName) => "", // localStorage.removeItem(flagName),
    )
  }
})

let redux: Promise<ReduxService>

browser.runtime.onConnect.addListener(async (port) => {
  ;(await redux).connectPort(port)
})

redux ??= startRedux()
