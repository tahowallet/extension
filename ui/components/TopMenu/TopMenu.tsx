import React, { ReactElement } from "react"
import TopMenuProtocolSwitcher from "./TopMenuProtocolSwitcher"
import TopMenuProfileButton from "./TopMenuProfileButton"

interface Props {
  toggleOpenProtocolList: () => void
  toggleOpenNotifications: () => void
  toggleOpenDAppConnectionInfo: () => void
  isConnectedToDApp: boolean
}

export default function TopMenu(props: Props): ReactElement {
  const {
    toggleOpenProtocolList,
    toggleOpenNotifications,
    toggleOpenDAppConnectionInfo,
    isConnectedToDApp,
  } = props

  return (
    <div className="nav_wrap">
      <nav className="standard_width_padded">
        <TopMenuProtocolSwitcher />
        <div className="profile_group">
          {isConnectedToDApp && (
            <button
              type="button"
              aria-label="Show current dApp connection"
              className="connection_button"
              onClick={toggleOpenDAppConnectionInfo}
            />
          )}
          <TopMenuProfileButton onClick={toggleOpenNotifications} />
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
  )
}
