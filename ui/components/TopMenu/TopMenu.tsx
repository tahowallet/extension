import React, { ReactElement } from "react"
import TopMenuProtocolSwitcher from "./TopMenuProtocolSwitcher"
import TopMenuProfileButton from "./TopMenuProfileButton"
import { useBackgroundSelector } from "../../hooks"

interface Props {
  toggleOpenProtocolList: () => void
  toggleOpenNotifications: () => void
  toggleOpenDAppConnectionInfo: () => void
}

export default function TopMenu(props: Props): ReactElement {
  const {
    toggleOpenProtocolList,
    toggleOpenNotifications,
    toggleOpenDAppConnectionInfo,
  } = props

  const [address, truncatedAddress] = useBackgroundSelector((background) => {
    return [
      background.ui.currentAccount?.address,
      background.ui.currentAccount?.truncatedAddress,
    ]
  })

  const { name, avatarURL } = useBackgroundSelector((background) => {
    const data = background.account.accountsData[address.toLowerCase()]
    if (typeof data === "object") {
      return data.ens
    }
    return {}
  })

  // TODO: set this with real data of the dApp connection
  const isConnectedToDApp = true

  return (
    <div className="nav_wrap">
      <nav className="standard_width_padded">
        <TopMenuProtocolSwitcher onClick={toggleOpenProtocolList} />
        <div className="profile_group">
          {isConnectedToDApp && (
            <button
              type="button"
              aria-label="Show current dApp connection"
              className="connection_button"
              onClick={toggleOpenDAppConnectionInfo}
            />
          )}
          <TopMenuProfileButton
            address={truncatedAddress}
            nickname={name || undefined}
            avatar={avatarURL || undefined}
            onClick={toggleOpenNotifications}
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
            margin-top: -5px;
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
