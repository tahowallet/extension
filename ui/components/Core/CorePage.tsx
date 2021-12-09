import React, { ReactElement, useState } from "react"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import TopMenu from "../TopMenu/TopMenu"
import TopMenuProtocolList from "../TopMenu/TopMenuProtocolList"
import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"
import TabBar from "../TabBar/TabBar"
import HiddenDevPanel from "../HiddenDevPanel/HiddenDevPanel"

interface Props {
  children: React.ReactNode
  hasTabBar: boolean
  hasTopBar: boolean
}

export default function CorePage(props: Props): ReactElement {
  const { children, hasTabBar, hasTopBar } = props

  const [isProtocolListOpen, setIsProtocolListOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

  function handleOpenHiddenDevMenu(e: React.MouseEvent) {
    if (process.env.NODE_ENV === "development" && e.detail === 3) {
      // setIsDevToolsOpen(true)
      window.open(
        `${window.location.origin}/dapp-connect-popup.html`,
        "",
        "popup,width=384,height=558,scrollbars=no"
      )
    }
  }

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
      <SharedSlideUpMenu
        isOpen={isNotificationsOpen}
        close={() => {
          setIsNotificationsOpen(false)
        }}
      >
        <AccountsNotificationPanel
          onCurrentAddressChange={() => setIsNotificationsOpen(false)}
        />
      </SharedSlideUpMenu>
      <SharedSlideUpMenu
        isOpen={isDevToolsOpen}
        size="small"
        close={() => {
          setIsDevToolsOpen(false)
        }}
      >
        <HiddenDevPanel />
      </SharedSlideUpMenu>
      <div className="page">
        <div className="alpha_label">Alpha</div>
        {hasTopBar ? (
          // Don't lint the extremely-custom-behavior completely-not-accessible
          // hidden dev menu for now.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
          <div className="top_menu_wrap" onClick={handleOpenHiddenDevMenu}>
            <TopMenu
              toggleOpenProtocolList={() => {
                setIsProtocolListOpen(!isProtocolListOpen)
              }}
              toggleOpenNotifications={() => {
                setIsNotificationsOpen(!isNotificationsOpen)
              }}
            />
          </div>
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
            width: 100%;
          }
          .page_content {
            height: 480px;
            width: 100%;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            margin: 0 auto;
            align-items: center;
          }
          .top_menu_wrap {
            z-index: 10;
            cursor: default;
          }
          .alpha_label {
            width: 57px;
            height: 20px;
            left: 24px;
            position: fixed;
            background-color: var(--error);
            border-bottom-left-radius: 4px;
            border-bottom-right-radius: 4px;
            box-sizing: border-box;
            padding-left: 8px;
            font-size: 14px;
            z-index: 1000;
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
