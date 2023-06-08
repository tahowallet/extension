/**
 * Feature flags which are set at build time.
 */
const BuildTimeFlag = {
  SWITCH_RUNTIME_FLAGS: process.env.SWITCH_RUNTIME_FLAGS === "true",
} as const

/**
 * Feature flags which are set at runtime.
 */
export const RuntimeFlag = {
  USE_MAINNET_FORK: process.env.USE_MAINNET_FORK === "true",
  HIDE_IMPORT_DERIVATION_PATH:
    process.env.HIDE_IMPORT_DERIVATION_PATH === "true",
  HIDE_SWAP_REWARDS: process.env.HIDE_SWAP_REWARDS === "true",
  USE_UPDATED_SIGNING_UI: process.env.USE_UPDATED_SIGNING_UI === "true",
  SUPPORT_MULTIPLE_LANGUAGES: process.env.SUPPORT_MULTIPLE_LANGUAGES === "true",
  ENABLE_ACHIEVEMENTS_TAB: process.env.ENABLE_ACHIEVEMENTS_TAB === "true",
  HIDE_TOKEN_FEATURES: process.env.HIDE_TOKEN_FEATURES === "true",
  SUPPORT_ARBITRUM_NOVA: process.env.SUPPORT_ARBITRUM_NOVA === "true",
  SUPPORT_ACHIEVEMENTS_BANNER:
    process.env.SUPPORT_ACHIEVEMENTS_BANNER === "true",
  SUPPORT_NFT_TAB: process.env.SUPPORT_NFT_TAB === "true",
  SUPPORT_NFT_SEND: process.env.SUPPORT_NFT_SEND === "true",
  SUPPORT_WALLET_CONNECT: process.env.SUPPORT_WALLET_CONNECT === "true",
  SUPPORT_SWAP_QUOTE_REFRESH: process.env.SUPPORT_SWAP_QUOTE_REFRESH === "true",
  SUPPORT_CUSTOM_NETWORKS: process.env.SUPPORT_CUSTOM_NETWORKS === "true",
  SUPPORT_CUSTOM_RPCS: process.env.SUPPORT_CUSTOM_RPCS === "true",
  SUPPORT_UNVERIFIED_ASSET: process.env.SUPPORT_UNVERIFIED_ASSET === "true",
  ENABLE_UPDATED_DAPP_CONNECTIONS:
    process.env.ENABLE_UPDATED_DAPP_CONNECTIONS === "true",
  SUPPORT_FLASHBOTS_RPC: process.env.SUPPORT_FLASHBOTS_RPC === "true",
} as const

type BuildTimeFlagType = keyof typeof BuildTimeFlag

export type RuntimeFlagType = keyof typeof RuntimeFlag

export type FeatureFlagType = RuntimeFlagType | BuildTimeFlagType

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
export const isEnabled = (
  flagName: FeatureFlagType,
  checkBrowserStorage: boolean = BuildTimeFlag.SWITCH_RUNTIME_FLAGS
): boolean => {
  // Guard to narrow flag type
  const isBuildTimeFlag = (flag: string): flag is BuildTimeFlagType =>
    flag in BuildTimeFlag

  if (isBuildTimeFlag(flagName)) {
    return BuildTimeFlag[flagName]
  }

  if (checkBrowserStorage) {
    const state = localStorage.getItem(flagName)
    return state !== null ? state === "true" : RuntimeFlag[flagName]
  }

  return RuntimeFlag[flagName]
}
