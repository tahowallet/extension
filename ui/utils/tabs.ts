import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { t } from "i18next"

export type TabInfo = {
  title: string
  path: string
  icon: string
}

const tabs: TabInfo[] = [
  {
    path: "/wallet",
    title: t("tabs.wallet"),
    icon: "wallet",
  },
  {
    path: "/portfolio",
    title: t("tabs.portfolio"),
    icon: "portfolio",
  },
  {
    path: "/swap",
    title: t("tabs.swap"),
    icon: "swap",
  },
  {
    path: "/earn",
    title: t("tabs.earn"),
    icon: "earn",
    visible: !isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES),
  },
  {
    path: "/settings",
    title: t("tabs.settings"),
    icon: "settings",
  },
]
  .map(({ visible = true, ...tab }) => (visible ? tab : null))
  .filter((tab): tab is TabInfo => tab !== null)

export const defaultTab = tabs[0]

export default tabs
