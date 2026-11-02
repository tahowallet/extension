import React, { ReactElement, useCallback } from "react"

import { matchPath, useHistory, useLocation } from "react-router-dom"
import {
  selectCurrentNetwork,
  // selectOpenAbilityCount,
} from "@tallyho/tally-background/redux-slices/selectors"
import { networkSupportsSwaps } from "@tallyho/tally-background/lib/0x-swap"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { useTranslation } from "react-i18next"
import browser from "webextension-polyfill"
import TabBarIconButton from "./TabBarIconButton"
import tabs, { defaultTab, TabInfo } from "../../utils/tabs"
import { useBackgroundSelector } from "../../hooks"

const isTabSupportedByNetwork = (tab: TabInfo, network: EVMNetwork) => {
  switch (tab.path) {
    case "/swap":
      return networkSupportsSwaps(network.chainID)
    default:
      return true
  }
}

export const FULL_TAB_ROOT = "tab.html#/"

/**
 * Opens the full-tab view of the extension and closes the popup. If a
 * full-tab view is already open, that tab and its window are focused instead
 * of opening a new one.
 *
 * Note that onboarding tabs, which are served from the same page, are never
 * reused.
 */
async function openFullTab(): Promise<void> {
  const baseURL = browser.runtime.getURL("tab.html")
  const [existingTab] = (
    await browser.tabs.query({ url: `${baseURL}*` })
  ).filter((tab) => tab.id !== undefined && !tab.url?.includes("onboarding"))

  if (existingTab?.id !== undefined) {
    await browser.tabs.update(existingTab.id, { active: true })
    if (existingTab.windowId !== undefined) {
      await browser.windows.update(existingTab.windowId, { focused: true })
    }
  } else {
    await browser.tabs.create({ url: browser.runtime.getURL(FULL_TAB_ROOT) })
  }

  window.close()
}

export default function TabBar(): ReactElement {
  const location = useLocation()
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  // const abilityCount = useBackgroundSelector(selectOpenAbilityCount)

  const history = useHistory()
  const { t } = useTranslation()

  const noActiveTab = ["abilities"].some((pathName) =>
    location.pathname.includes(pathName),
  )

  const activeTab =
    tabs.find(({ path }) =>
      matchPath(location.pathname, { path, exact: false }),
    ) ?? defaultTab

  const hasNotifications = useCallback(
    (path: string): boolean => {
      switch (path) {
        case "/portfolio":
          return false // abilityCount > 0
        default:
          return false
      }
    },
    [/* abilityCount */],
  )

  return (
    <nav aria-label="Main">
      {tabs
        .filter((tab) => isTabSupportedByNetwork(tab, selectedNetwork))
        .map(({ path, title, icon }) => (
          <TabBarIconButton
            key={path}
            icon={icon}
            title={t(title)}
            onClick={() => history.push(path)}
            isActive={noActiveTab ? false : activeTab.path === path}
            showNotifications={hasNotifications(path)}
          />
        ))}
      <TabBarIconButton
        icon="full_tab"
        title={t("tabs.expand")}
        onClick={() => {
          void openFullTab()
        }}
      />
      <style jsx>
        {`
          nav {
            width: 100%;
            height: 56px;
            background-color: var(--hunter-green);
            display: flex;
            justify-content: space-around;
            box-sizing: border-box;
            align-items: center;
            flex-shrink: 0;
            box-shadow: var(--shadow-edge);
            z-index: var(--z-sticky);
          }
        `}
      </style>
    </nav>
  )
}
