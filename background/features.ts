/**
 * Used to keep in memory feature settings that were asynchronously
 * resolved during extension startup.
 */
export const storage = new Map<string, string>()

export const DynamicSettingsStorageKey = "tally-dynamic-settings"

/**
 * Feature flags which are set at build time.
 */
const BuildTimeFlag = {
  SWITCH_RUNTIME_FLAGS: process.env.SWITCH_RUNTIME_FLAGS === "true",
} as const

/**
 * Build time settings that can be overriden with in memory values.
 * These settings must not be modified during runtime as it could cause
 * unexpected behaviour.
 */
export const DynamicSettings = {
  USE_CAMPAIGN_NFT_CONTRACT: {
    initialValue: process.env.USE_CAMPAIGN_NFT_CONTRACT,
    resolver: (v) => v,
  },
  SUPPORT_MEZO_NETWORK: {
    initialValue: process.env.SUPPORT_MEZO_NETWORK,
    resolver: (v) => v === "true",
  },
} satisfies {
  [key: string]: {
    initialValue: string | undefined
    resolver?: (v: string | undefined) => unknown
  }
}

type DynamicSettingType = keyof typeof DynamicSettings

type DynamicFlagType = {
  [k in DynamicSettingType]: ReturnType<
    (typeof DynamicSettings)[k]["resolver"]
  > extends boolean
    ? k
    : never
}[DynamicSettingType]

export const getDynamicSettingValue = <K extends DynamicSettingType>(
  flag: K,
) => {
  const { initialValue, resolver } = DynamicSettings[flag]
  const storedValue = storage.get(flag)

  return resolver(storedValue ?? initialValue) as ReturnType<
    (typeof DynamicSettings)[K]["resolver"]
  >
}

/**
 * Feature flags which are set at runtime.
 */
export const RuntimeFlag = {
  USE_MAINNET_FORK: process.env.USE_MAINNET_FORK === "true",
  SHOW_IMPORT_DERIVATION_PATH:
    process.env.SHOW_IMPORT_DERIVATION_PATH === "true",
  SHOW_SWAP_REWARDS: process.env.SHOW_SWAP_REWARDS === "true",
  SUPPORT_MULTIPLE_LANGUAGES: process.env.SUPPORT_MULTIPLE_LANGUAGES === "true",
  SHOW_TOKEN_FEATURES: process.env.SHOW_TOKEN_FEATURES === "true",
  SUPPORT_ARBITRUM_NOVA: process.env.SUPPORT_ARBITRUM_NOVA === "true",
  SUPPORT_ACHIEVEMENTS_BANNER:
    process.env.SUPPORT_ACHIEVEMENTS_BANNER === "true",
  SUPPORT_NFT_SEND: process.env.SUPPORT_NFT_SEND === "true",
  SUPPORT_WALLET_CONNECT: process.env.SUPPORT_WALLET_CONNECT === "true",
  SUPPORT_SWAP_QUOTE_REFRESH: process.env.SUPPORT_SWAP_QUOTE_REFRESH === "true",
  SUPPORT_CUSTOM_NETWORKS: process.env.SUPPORT_CUSTOM_NETWORKS === "true",
  SUPPORT_CUSTOM_RPCS: process.env.SUPPORT_CUSTOM_RPCS === "true",
  SHOW_ISLAND_UI: process.env.SHOW_ISLAND_UI === "true",
  SUPPORT_THE_ISLAND: process.env.SUPPORT_THE_ISLAND === "true",
  SUPPORT_THE_ISLAND_ON_TENDERLY:
    process.env.SUPPORT_THE_ISLAND_ON_TENDERLY === "true",
} as const

type BuildTimeFlagType = keyof typeof BuildTimeFlag

export type RuntimeFlagType = keyof typeof RuntimeFlag

export type FeatureFlagType =
  | RuntimeFlagType
  | BuildTimeFlagType
  | DynamicFlagType

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
 * Checks the status of the feature flag and returns `true` if the flag is set
 * to `true`. Note that some historical flags might have inverted meaning by
 * default (e.g. `HIDE_...`, when set to `true`, might indicate disabling a
 * feature).
 *
 * If the `SWITCH_RUNTIME_FLAGS` feature flag is disabled all flags are read from
 * environment variables.
 *
 * If the `SWITCH_RUNTIME_FLAGS` feature flag is on then the value for runtime
 * flags are read from localStorage first, and, if the value does not exist in
 * localStorage, then it is read from the environment variables.
 *
 * The value for build time flags is always read from environment variables.
 */
export function isEnabled(
  flagName: FeatureFlagType,
  checkBrowserStorage: boolean = BuildTimeFlag.SWITCH_RUNTIME_FLAGS,
): boolean {
  // Guard to narrow flag type
  const isBuildTimeFlag = (flag: string): flag is BuildTimeFlagType =>
    flag in BuildTimeFlag

  const isDynamicSetting = (flag: string): flag is DynamicFlagType =>
    flag in DynamicSettings

  if (isBuildTimeFlag(flagName)) {
    return BuildTimeFlag[flagName]
  }

  if (isDynamicSetting(flagName)) {
    return getDynamicSettingValue(flagName)
  }

  if (checkBrowserStorage) {
    const state = "" as string // localStorage.getItem(flagName)
    return state !== null ? state === "true" : RuntimeFlag[flagName]
  }

  return RuntimeFlag[flagName]
}

/**
 * Checks the inverse of `isEnabled`; used for clarity as an alternative to
 * `!isEnabled`.
 */
export function isDisabled(
  flagName: FeatureFlagType,
  checkBrowserStorage: boolean = BuildTimeFlag.SWITCH_RUNTIME_FLAGS,
): boolean {
  return !isEnabled(flagName, checkBrowserStorage)
}

/**
 * If the flag is enabled, wraps the given value in a single-item array and returns it.
 * Otherwise, returns an empty array.
 *
 * Useful for cases where something is added conditionally to an array
 * based on a feature flag--this function can be called with the spread
 * operator to achieve that conditional wrapping, as in:
 *
 * ```
 * const myArray = [
 *   alwaysIncludeThis,
 *   andThis,
 *   ...wrapIfEnabled(myFeatureFlag, onlyIncludeWhenMyFeatureFlagIsEnabled),
 * ]
 * ```
 */
export function wrapIfEnabled<T>(
  flag: FeatureFlagType,
  valueToWrap: T,
): [T] | [] {
  return isEnabled(flag) ? [valueToWrap] : []
}

/**
 * It works in the same way as the wrapIfEnabled function.
 * But checks the inverse of `isEnabled`.
 *
 */
export function wrapIfDisabled<T>(
  flag: FeatureFlagType,
  valueToWrap: T,
): [T] | [] {
  return isDisabled(flag) ? [valueToWrap] : []
}
