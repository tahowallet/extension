import React, { ReactElement } from "react"
import { ErrorBoundary } from "react-error-boundary"
import Snackbar from "../Snackbar/Snackbar"
import TabBar from "../TabBar/TabBar"
import TopMenu from "../TopMenu/TopMenu"
import ErrorFallback from "../../pages/ErrorFallback"

interface Props {
  children?: React.ReactNode
  hasTopBar?: boolean
  hasTabBar?: boolean
}

/**
 * The frame of a popup page: the optional top and tab bars around a
 * scrolling main area. Errors in the page's content render in its place.
 */
export default function CorePage({
  children,
  hasTopBar = false,
  hasTabBar = false,
}: Props): ReactElement {
  return (
    <section>
      {hasTopBar && <TopMenu />}
      <main>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          {children}
        </ErrorBoundary>
        <Snackbar />
      </main>
      {hasTabBar && <TabBar />}
      <style jsx>
        {`
          section {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          main {
            width: 100%;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin: 0 auto;
            align-items: center;
            background-color: var(--hunter-green);
            height: 100%;
          }
          .top_menu_wrap {
            z-index: 10;
            cursor: default;
          }
        `}
      </style>
    </section>
  )
}
