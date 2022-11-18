import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"

const tabs: string[] = [
  "wallet",
  "NFTs",
  "portfolio",
  "swap",
  "earn",
  "settings",
].filter((tab) => {
  if (tab === "earn" && isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES)) {
    return false
  }
  if (tab === "NFTs" && !isEnabled(FeatureFlags.SUPPORT_NFT_TAB)) {
    return false
  }
  if (tab === "swap" && isEnabled(FeatureFlags.SUPPORT_NFT_TAB)) {
    return false
  }
  return true
})

export default tabs
