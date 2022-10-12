import { FeatureFlagTypes, isEnabled } from "@tallyho/tally-background/features"

const tabs: string[] = [
  "portfolio",
  "wallet",
  "swap",
  "earn",
  "settings",
].filter((tab) => {
  if (tab === "earn" && isEnabled(FeatureFlagTypes.HIDE_TOKEN_FEATURES)) {
    return false
  }
  return true
})

export default tabs
