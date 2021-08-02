import React, { useState } from "react"
import PropTypes from "prop-types"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import TopMenuProtocolList from "../TopMenu/TopMenuProtocolList"
import TopMenu from "../TopMenu/TopMenu"
import TabBar from "../TabBar/TabBar"

export default function CorePage(props) {
  const { children, hasTabBar, hasTopBar } = props

  const [isProtocolListOpen, setIsProtocolListOpen] = useState(false)

  return (
    <main>
      <SharedSlideUpMenu
        isOpen={isProtocolListOpen}
        close={() => {
          setIsProtocolListOpen(false)
        }}
      >
        <TopMenuProtocolList />
      </SharedSlideUpMenu>
      <div className="page">
        {hasTopBar ? (
          <button
            type="button"
            className="trigger"
            onClick={() => {
              setIsProtocolListOpen(!isProtocolListOpen)
            }}
          >
            <TopMenu />
          </button>
        ) : null}

        <div className="page_content">{children}</div>
        {hasTabBar ? <TabBar /> : null}
      </div>
      <style jsx>
        {`
          .page {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            height: 100vh;
            width: 100vw;
          }
          .page_content {
            height: 480px;
            width: 100%;
            overflow-y: scroll;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin: 0 auto;
            align-items: center;
          }
          .trigger {
            z-index: 10;
          }
        `}
      </style>
    </main>
  )
}

CorePage.propTypes = {
  children: PropTypes.node.isRequired,
  hasTabBar: PropTypes.bool,
  hasTopBar: PropTypes.bool,
}

CorePage.defaultProps = {
  hasTabBar: true,
  hasTopBar: true,
}
