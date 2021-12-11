import React, { ReactElement, useCallback, useEffect, useState } from "react"

import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { selectAllowedPages } from "@tallyho/tally-background/redux-slices/selectors"
import { browser } from "@tallyho/tally-background"

import { useBackgroundSelector } from "../../hooks"
import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"
import HiddenDevPanel from "../HiddenDevPanel/HiddenDevPanel"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import TabBar from "../TabBar/TabBar"
import TopMenu from "../TopMenu/TopMenu"
import TopMenuConnectedDAppInfo from "../TopMenu/TopMenuConnectedDAppInfo"
import TopMenuProtocolList from "../TopMenu/TopMenuProtocolList"

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
  const [isActiveDAppConnectionInfoOpen, setIsActiveDAppConnectionInfoOpen] =
    useState(false)
  const [currentPermission, setCurrentPermission] = useState<PermissionRequest>(
    {} as PermissionRequest
  )
  const [isConnectedToDApp, setIsConnectedToDApp] = useState(false)

  const allowedPages = useBackgroundSelector(selectAllowedPages)

  const initPermissionAndOrigin = useCallback(async () => {
    const { url, favIconUrl, title } = await browser.tabs
      .query({
        active: true,
        lastFocusedWindow: true,
      })
      .then((tabs) =>
        tabs[0] ? tabs[0] : { url: "", favIconUrl: "", title: "" }
      )

    if (!url) return

    const { origin } = new URL(url)

    if (allowedPages[origin]) {
      setCurrentPermission(allowedPages[origin])
      setIsConnectedToDApp(true)
    } else {
      setCurrentPermission({
        origin,
        faviconUrl: favIconUrl ?? "",
        title: title ?? "",
        state: "deny",
      })
    }
  }, [allowedPages, setCurrentPermission])

  useEffect(() => {
    initPermissionAndOrigin()
  }, [initPermissionAndOrigin])

  function handleOpenHiddenDevMenu(e: React.MouseEvent) {
    if (process.env.NODE_ENV === "development" && e.detail === 3) {
      setIsDevToolsOpen(true)
    }
  }

  return (
    <main>
      {isConnectedToDApp && isActiveDAppConnectionInfoOpen ? (
        <TopMenuConnectedDAppInfo
          title={currentPermission.title}
          url={currentPermission.origin}
          faviconUrl={currentPermission.faviconUrl}
          close={() => {
            setIsActiveDAppConnectionInfoOpen(false)
          }}
        />
      ) : null}
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
        <div className="community_edition_label">Community Edition</div>
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
              toggleOpenDAppConnectionInfo={() => {
                setIsActiveDAppConnectionInfoOpen(
                  !isActiveDAppConnectionInfoOpen
                )
              }}
              isConnectedToDApp={isConnectedToDApp}
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
    </main>
  )
}

CorePage.defaultProps = {
  hasTabBar: true,
  hasTopBar: true,
}
