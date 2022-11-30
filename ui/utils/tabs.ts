import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { I18nKey } from "../_locales/i18n"

export type TabInfo = {
  /**
   * i18n key with the title for this tab
   */
  title: I18nKey
  path: string
  icon: string
}

const allTabs: (TabInfo & { visible?: boolean })[] = [
  {
    path: "/wallet",
    title: "tabs.wallet",
    icon: "wallet",
  },
  {
    path: "/nfts",
    title: "tabs.nfts",
    icon: "nfts",
    visible: isEnabled(FeatureFlags.SUPPORT_NFT_TAB),
  },
  {
    path: "/portfolio",
    title: "tabs.portfolio",
    icon: "portfolio",
  },
  {
    path: "/swap",
    title: "tabs.swap",
    icon: "swap",
    visible: !isEnabled(FeatureFlags.SUPPORT_NFT_TAB),
  },
  {
    path: "/earn",
    title: "tabs.earn",
    icon: "earn",
    visible: !isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES),
  },
  {
    path: "/settings",
    title: "tabs.settings",
    icon: "settings",
  },
]

const tabs = allTabs
  .map(({ visible = true, ...tab }) => (visible ? tab : null))
  .filter((tab): tab is TabInfo => tab !== null)

export const defaultTab = tabs[0]

export default tabs
