import classNames from "classnames"
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
  /**
   * Indicates how direct children of the page should be aligned. Defaults to
   * center. Start is roughly equivalent to left (but respects right-to-left
   * language ordering), and end is equivalent to right.
   */
  contentAlign: "center" | "start" | "end"
  /**
   * When specified, the page is set to have the standard popup width. If set
   * to `padded`, standard padding is applied.
   */
  standardWidth?: true | "padded"
}

export default function CorePage(props: Props): ReactElement {
  const {
    children,
    hasTopBar,
    hasTabBar,
    handleScrolling,
    contentAlign,
    standardWidth,
  } = props

  return (
    <section>
      {hasTopBar ? <TopMenu /> : <></>}
      <main
        className={classNames({
          standard_width: standardWidth === true,
          standard_width_padded: standardWidth === "padded",
        })}
      >
        {children}
        <Snackbar />
      </main>
      {hasTabBar ? <TabBar /> : <></>}
      <style jsx>
        {`
          section {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          main {
            ${standardWidth === undefined ? "width: 100%;" : ""}

            ${handleScrolling
              ? "overflow-y: auto"
              : "height: 100%; overflow: hidden;"};
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin: 0 auto;
            align-items: ${contentAlign};
            background-color: var(--hunter-green);
          }
        `}
      </style>
    </section>
  )
}

CorePage.defaultProps = {
  hasTopBar: false,
  hasTabBar: false,
  handleScrolling: true,
  contentAlign: "center",
}
