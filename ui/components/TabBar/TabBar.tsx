import React, { ReactElement } from "react"

import { useLocation } from "react-router-dom"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { NETWORKS_SUPPORTING_SWAPS } from "@tallyho/tally-background/constants/networks"
import TabBarIcon from "./TabBarIcon"
import tabs from "../../utils/tabs"
import { useBackgroundSelector } from "../../hooks"

export default function TabBar(): ReactElement {
  const location = useLocation()
  const activeTabName = location?.pathname?.split("/")[1] || "wallet"
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const isTabSupportedByNetwork = (tab: string) => {
    switch (tab) {
      case "swap":
        return NETWORKS_SUPPORTING_SWAPS.includes(selectedNetwork.chainID)
      default:
        return true
    }
  }

  return (
    <nav>
      {tabs.filter(isTabSupportedByNetwork).map((tabName) => {
        return (
          <TabBarIcon
            key={tabName}
            name={tabName}
            isActive={activeTabName === tabName}
          />
        )
      })}
      <style jsx>
        {`
          nav {
            width: 100%;
            height: 56px;
            background-color: var(--hunter-green);
            display: flex;
            justify-content: space-around;
            padding: 0px 46px;
            box-sizing: border-box;
            align-items: center;
            flex-shrink: 0;
            box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
            z-index: 10;
          }
        `}
      </style>
    </nav>
  )
}
