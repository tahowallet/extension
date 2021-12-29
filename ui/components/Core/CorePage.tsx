import React, { ReactElement } from "react"
import Snackbar from "../Snackbar/Snackbar"

interface Props {
  children: React.ReactNode
  hasTabBar: boolean
  hasTopBar: boolean
}

export default function CorePage(props: Props): ReactElement {
  const { children, hasTabBar, hasTopBar } = props

  return (
    <main>
      {children}
      <Snackbar />
      <style jsx>
        {`
          main {
            width: 100%;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin: 0 auto;
            align-items: center;
            background-color: var(--hunter-green);
            z-index: 10;
            height: ${hasTopBar ? "480px" : "100vh"};
            margin-top: ${hasTopBar ? "0px" : "-64px"};
          }
          .top_menu_wrap {
            z-index: 10;
            cursor: default;
          }
        `}
      </style>
    </main>
  )
}

CorePage.defaultProps = {
  hasTabBar: true,
  hasTopBar: true,
}
