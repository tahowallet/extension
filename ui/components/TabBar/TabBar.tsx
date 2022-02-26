import React, { ReactElement } from "react"

import { useLocation } from "react-router-dom"
import TabBarIcon from "./TabBarIcon"
import tabs from "../../utils/tabs"

export default function TabBar(): ReactElement {
  const location = useLocation()
  const activeTabName = location?.pathname?.split("/")[1] || "wallet"

  return (
    <nav>
      {tabs.map((tabName) => {
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
