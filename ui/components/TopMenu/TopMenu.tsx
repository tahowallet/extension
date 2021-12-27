import React, { ReactElement, useState } from "react"
import { TransitionGroup, CSSTransition } from "react-transition-group"
import { useHistory } from "react-router-dom"
import TopMenuProtocolSwitcher from "./TopMenuProtocolSwitcher"
import TopMenuProfileButton from "./TopMenuProfileButton"

import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"
import HiddenDevPanel from "../HiddenDevPanel/HiddenDevPanel"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import TopMenuConnectedDAppInfo from "./TopMenuConnectedDAppInfo"
import TopMenuProtocolList from "./TopMenuProtocolList"

export default function TopMenu(): ReactElement {
  const [isProtocolListOpen, setIsProtocolListOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)
  const [isActiveDAppConnectionInfoOpen, setIsActiveDAppConnectionInfoOpen] =
    useState(false)

  const isConnectedToDApp = true
  return (
    <>
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
      <div className="nav_wrap">
        <nav className="standard_width_padded">
          <TopMenuProtocolSwitcher />
          <div className="profile_group">
            {isConnectedToDApp && (
              <button
                type="button"
                aria-label="Show current dApp connection"
                className="connection_button"
                onClick={() => {}}
              />
            )}
            <TopMenuProfileButton
              onClick={() => {
                setIsNotificationsOpen(true)
              }}
            />
          </div>
        </nav>

        <style jsx>
          {`
            nav {
              flex-shrink: 0;
              height: 52px;
              margin-top: 6px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-right: 0;
            }
            .nav_wrap {
              width: 100%;
              box-shadow: 0px 6px 11px var(--hunter-green);
              margin-bottom: 6px;
              z-index: inherit;
            }
            }
            .profile_group {
              display: flex;
              align-items: center;
            }
            .connection_button {
              background: url("./images/bolt@2x.png") center no-repeat;
              border-radius: 12px;
              background-size: 10px 20px;
              border: solid 3px var(--hunter-green);
              width: 32px;
              height: 32px;
              margin-right: 2px;
            }
            .connection_button:hover {
              background-color: var(--green-80);
            }
          `}
        </style>
      </div>
    </>
  )
}
