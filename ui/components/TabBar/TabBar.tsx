import React, { ReactElement } from "react"
import { useLocation } from "react-router-dom"
import TabBarIcon from "./TabBarIcon"

export default function TabBar(): ReactElement {
  const location = useLocation()
  const activeTabName = location.pathname.split("/")[1] || "wallet"
  const tabs = ["overview", "wallet", "swap", "earn", "menu"].filter((tab) => {
    if (tab === "earn" && process.env.HIDE_EARN_PAGE === "true") {
      return false
    }

    return true
  })

  return (
    <nav>
      {tabs.map((tabName) => (
        <TabBarIcon
          key={tabName}
          name={tabName}
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
