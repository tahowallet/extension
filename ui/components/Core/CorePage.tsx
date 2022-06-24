import React, { ReactElement } from "react"
import Snackbar from "../Snackbar/Snackbar"

interface Props {
  children: React.ReactNode
  hasTopBar?: boolean
  hasTabBar?: boolean
}

export default function CorePage(props: Props): ReactElement {
  const { children, hasTopBar, hasTabBar } = props

  let barSpace = 0
  if (hasTabBar) {
    // Tab bar is given 56px of height
    barSpace += 56
  }
  if (hasTopBar) {
    // Top bar is given 64px of height
    barSpace += 64
  }

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
            height: calc(100vh - ${barSpace}px);
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
  hasTopBar: true,
}
