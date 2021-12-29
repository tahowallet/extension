import {
  HIDE_SWAP,
  HIDE_EARN_PAGE,
} from "@tallyho/tally-background/features/features"

const tabs: string[] = ["overview", "wallet", "swap", "earn", "menu"].filter(
  (tab) => {
    if ((tab === "earn" && HIDE_EARN_PAGE) || (tab === "swap" && HIDE_SWAP)) {
      return false
    }
    return true
  }
)

export default tabs
