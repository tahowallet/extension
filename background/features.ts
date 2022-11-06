/**
 * Feature flags which are set at build time.
 */
const BuildTimeFlag: Record<string, boolean> = {
  SUPPORT_TABBED_ONBOARDING: process.env.SUPPORT_TABBED_ONBOARDING === "true",
  SWITCH_RUNTIME_FLAGS: process.env.SWITCH_RUNTIME_FLAGS === "true",
}

/**
 * Feature flags which are set at runtime.
 */
export const RuntimeFlag: Record<string, boolean> = {
  USE_MAINNET_FORK: process.env.USE_MAINNET_FORK === "true",
  RESOLVE_RNS_NAMES: process.env.RESOLVE_RNS_NAMES === "true",
  HIDE_IMPORT_DERIVATION_PATH:
    process.env.HIDE_IMPORT_DERIVATION_PATH === "true",
  HIDE_SWAP_REWARDS: process.env.HIDE_SWAP_REWARDS === "true",
  USE_UPDATED_SIGNING_UI: process.env.USE_UPDATED_SIGNING_UI === "true",
  SUPPORT_MULTIPLE_LANGUAGES: process.env.SUPPORT_MULTIPLE_LANGUAGES === "true",
  SUPPORT_ANALYTICS: process.env.SUPPORT_ANALYTICS === "true",
  SUPPORT_KEYRING_LOCKING: process.env.SUPPORT_KEYRING_LOCKING === "true",
  SUPPORT_FORGOT_PASSWORD: process.env.SUPPORT_FORGOT_PASSWORD === "true",
  ENABLE_ACHIEVEMENTS_TAB: process.env.ENABLE_ACHIEVEMENTS_TAB === "true",
  HIDE_TOKEN_FEATURES: process.env.HIDE_TOKEN_FEATURES === "true",
  SUPPORT_RSK: process.env.SUPPORT_RSK === "true",
  SUPPORT_ACHIEVEMENTS_BANNER:
    process.env.SUPPORT_ACHIEVEMENTS_BANNER === "true",
  SUPPORT_SIMULATION_TAB: process.env.SUPPORT_SIMULATION_TAB === "true",
}

/**
 * Object with all feature flags. The key is the same as the value.
 */
export const FeatureFlags: Record<string, string> = Object.keys({
  ...BuildTimeFlag,
  ...RuntimeFlag,
}).reduce((types, flagName) => ({ ...types, [flagName]: flagName }), {})

/**
 * Checks the status of the feature flag.
 * If the SWITCH_RUNTIME_FLAGS is off all flags are read from environment variables.
 * If the SWITCH_RUNTIME_FLAGS is on then value for run time flag is read from Local Storage.
 * If value is not exist then is read from environment variables.
 * The value for the build time flag is read from environment variables.
 */
export const isEnabled = (flagName: string): boolean => {
  if (flagName in BuildTimeFlag) {
    return BuildTimeFlag[flagName]
  }
  if (BuildTimeFlag.SWITCH_RUNTIME_FLAGS) {
    const state = localStorage.getItem(flagName)
    return state !== null ? state === "true" : RuntimeFlag[flagName]
  }
  return RuntimeFlag[flagName]
}
