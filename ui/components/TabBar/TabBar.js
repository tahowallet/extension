import React from "react"
import { getCurrent } from "react-chrome-extension-router"
import { routes } from "../../config/routes"
import TabBarIcon from "./TabBarIcon"

export default function TabBar() {
  const activeTabName = getCurrent()?.component?.name?.toLowerCase() || "wallet"
  const tabs = ["accounts", "wallet", "swap", "earn", "menu"]

  return (
    <nav>
      {tabs.map((tabName) => (
        <TabBarIcon
          name={tabName}
          component={routes[tabName]}
          isActive={activeTabName === tabName}
        />
      ))}
      <style jsx>
        {`
          nav {
            width: 100vw;
            height: 56px;
            background-color: var(--hunter-green);
            display: flex;
            justify-content: space-around;
            padding: 0px 17px;
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
