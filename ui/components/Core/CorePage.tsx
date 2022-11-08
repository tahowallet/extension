import React, { ReactElement } from "react"
import Snackbar from "../Snackbar/Snackbar"
import TabBar from "../TabBar/TabBar"
import TopMenu from "../TopMenu/TopMenu"

interface Props {
  children: React.ReactNode
  hasTopBar: boolean
  hasTabBar: boolean
  /**
   * Indicates whether the page component should handle scrolling, or whether
   * children will handle it instead.
   */
  handleScrolling: boolean
}

export default function CorePage(props: Props): ReactElement {
  const { children, hasTopBar, hasTabBar, handleScrolling } = props

  return (
    <>
      {hasTopBar ? <TopMenu /> : <></>}
      <main>
        {children}
        <Snackbar />
      </main>
      {hasTabBar ? <TabBar /> : <></>}
      <style jsx>
        {`
          main {
            width: 100%;
            ${handleScrolling
              ? "overflow-y: auto"
              : "height: 100%; overflow: hidden;"};
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin: 0 auto;
            align-items: center;
            background-color: var(--hunter-green);
          }
        `}
      </style>
    </>
  )
}

CorePage.defaultProps = {
  hasTopBar: false,
  hasTabBar: false,
  handleScrolling: true,
}
