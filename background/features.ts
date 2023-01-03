/**
 * Feature flags which are set at build time.
 */
const BuildTimeFlag = {
  SUPPORT_TABBED_ONBOARDING: process.env.SUPPORT_TABBED_ONBOARDING === "true",
  SWITCH_RUNTIME_FLAGS: process.env.SWITCH_RUNTIME_FLAGS === "true",
} as const

/**
 * Feature flags which are set at runtime.
 */
export const RuntimeFlag = {
  USE_MAINNET_FORK: process.env.USE_MAINNET_FORK === "true",
  RESOLVE_RNS_NAMES: process.env.RESOLVE_RNS_NAMES === "true",
  HIDE_IMPORT_DERIVATION_PATH:
    process.env.HIDE_IMPORT_DERIVATION_PATH === "true",
  HIDE_SWAP_REWARDS: process.env.HIDE_SWAP_REWARDS === "true",
  USE_UPDATED_SIGNING_UI: process.env.USE_UPDATED_SIGNING_UI === "true",
  SUPPORT_MULTIPLE_LANGUAGES: process.env.SUPPORT_MULTIPLE_LANGUAGES === "true",
  SUPPORT_ANALYTICS: process.env.SUPPORT_ANALYTICS === "true",
  ENABLE_ANALYTICS_DEFAULT_ON:
    process.env.ENABLE_ANALYTICS_DEFAULT_ON === "true",
  SHOW_ANALYTICS_DELETE_DATA_BUTTON:
    process.env.SHOW_ANALYTICS_DELETE_DATA_BUTTON === "true",
  SUPPORT_KEYRING_LOCKING: process.env.SUPPORT_KEYRING_LOCKING === "true",
  SUPPORT_FORGOT_PASSWORD: process.env.SUPPORT_FORGOT_PASSWORD === "true",
  ENABLE_ACHIEVEMENTS_TAB: process.env.ENABLE_ACHIEVEMENTS_TAB === "true",
  HIDE_TOKEN_FEATURES: process.env.HIDE_TOKEN_FEATURES === "true",
  SUPPORT_RSK: process.env.SUPPORT_RSK === "true",
  SUPPORT_AVALANCHE: process.env.SUPPORT_AVALANCHE === "true",
  SUPPORT_BINANCE_SMART_CHAIN:
    process.env.SUPPORT_BINANCE_SMART_CHAIN === "true",
  SUPPORT_ARBITRUM_NOVA: process.env.SUPPORT_ARBITRUM_NOVA === "true",
  SUPPORT_ACHIEVEMENTS_BANNER:
    process.env.SUPPORT_ACHIEVEMENTS_BANNER === "true",
  SUPPORT_NFT_TAB: process.env.SUPPORT_NFT_TAB === "true",
  SUPPORT_NFT_SEND: process.env.SUPPORT_NFT_SEND === "true",
  SUPPORT_WALLET_CONNECT: process.env.SUPPORT_WALLET_CONNECT === "true",
  SUPPORT_ABILITIES: process.env.SUPPORT_ABILITIES === "true",
  SUPPORT_CUSTOM_NETWORKS: process.env.SUPPORT_CUSTOM_NETWORKS === "true",
} as const

type BuildTimeFlagType = keyof typeof BuildTimeFlag

export type RuntimeFlagType = keyof typeof RuntimeFlag

type FeatureFlagType = RuntimeFlagType | BuildTimeFlagType

/**
 * Object with all feature flags. The key is the same as the value.
 */
export const FeatureFlags = Object.keys({
  ...BuildTimeFlag,
  ...RuntimeFlag,
}).reduce((types, flagName) => ({ ...types, [flagName]: flagName }), {}) as {
  [Flag in FeatureFlagType]: Flag
}

/**
 * Checks the status of the feature flag.
 * If the SWITCH_RUNTIME_FLAGS is off all flags are read from environment variables.
 * If the SWITCH_RUNTIME_FLAGS is on then value for run time flag is read from Local Storage.
 * If value is not exist then is read from environment variables.
 * The value for the build time flag is read from environment variables.
 */
export const isEnabled = (flagName: FeatureFlagType): boolean => {
  // Guard to narrow flag type
  const isBuildTimeFlag = (flag: string): flag is BuildTimeFlagType =>
    flag in BuildTimeFlag

  if (isBuildTimeFlag(flagName)) {
    return BuildTimeFlag[flagName]
  }

  if (BuildTimeFlag.SWITCH_RUNTIME_FLAGS) {
    const state = localStorage.getItem(flagName)
    return state !== null ? state === "true" : RuntimeFlag[flagName]
  }

  return RuntimeFlag[flagName]
}
