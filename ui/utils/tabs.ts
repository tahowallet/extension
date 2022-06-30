import { HIDE_TOKEN_FEATURES } from "@tallyho/tally-background/features"

const tabs: string[] = ["overview", "wallet", "swap", "earn", "menu"].filter(
  (tab) => {
    if (tab === "earn" && HIDE_TOKEN_FEATURES) {
      return false
    }
    return true
  }
)

export default tabs
