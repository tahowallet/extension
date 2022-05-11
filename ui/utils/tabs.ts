import {
  HIDE_EARN_PAGE,
  HIDE_TOKEN_FEATURES,
} from "@tallyho/tally-background/features"

const tabs: string[] = ["overview", "wallet", "swap", "earn", "menu"].filter(
  (tab) => {
    if (tab === "earn" && (HIDE_TOKEN_FEATURES || HIDE_EARN_PAGE)) {
      return false
    }
    return true
  }
)

export default tabs
