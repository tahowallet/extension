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
    <div className="page">
      {children}
      <Snackbar />
      <style jsx>
        {`
          .page {
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
          .community_edition_label {
            width: 140px;
            height: 20px;
            left: 24px;
            position: fixed;
            background-color: var(--gold-60);
            color: var(--hunter-green);
            font-weight: 500;
            text-align: center;
            border-bottom-left-radius: 4px;
            border-bottom-right-radius: 4px;
            font-size: 14px;
            z-index: 1000;
          }
        `}
      </style>
    </div>
  )
}

CorePage.defaultProps = {
  hasTabBar: true,
  hasTopBar: true,
}
