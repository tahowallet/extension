import { browser, startRedux } from "@tallyho/tally-background"
import {
  FeatureFlags,
  isEnabled,
  RuntimeFlag,
  DynamicSettingsStorageKey,
  storage,
} from "@tallyho/tally-background/features"
import logger from "@tallyho/tally-background/lib/logger"
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

type CampaignsJson = {
  MEZOXTAHO?: {
    contractAddress: string
  }
}

const tryUpdateCampaignSettings = async () => {
  try {
    const response = await fetch("https://taho.xyz/campaigns.json")
    const json: CampaignsJson = await response.json()

    if (json.MEZOXTAHO) {
      await browser.storage.local.set({
        [DynamicSettingsStorageKey]: {
          USE_CAMPAIGN_NFT_CONTRACT: json.MEZOXTAHO.contractAddress,
          SUPPORT_MEZO_NETWORK: "true",
        },
      })
    }
  } catch (error) {
    logger.error("Could not update campaigns settings", error)
  }
}

/**
 * Retrieves stored settings from storage and pushes them to
 * in memory storage
 */
const tryRestoreDynamicSettings = async () => {
  try {
    const flags = await browser.storage.local
      .get(DynamicSettingsStorageKey)
      .then(
        (dict) =>
          (dict[DynamicSettingsStorageKey] ?? {}) as Record<string, unknown>,
      )

    Object.keys(flags).forEach((key) => {
      const value = flags[key]
      if (typeof value === "string") {
        storage.set(key, value)
      }
    })
  } catch {
    logger.error("Could not read runtime flags from local storage")
  }
}

browser.runtime.onStartup.addListener(async () => {
  tryUpdateCampaignSettings()
})

const redux = tryRestoreDynamicSettings().then(() => startRedux())

browser.runtime.onConnect.addListener(async (port) => {
  const service = await redux
  service.connectPort(port)
})
