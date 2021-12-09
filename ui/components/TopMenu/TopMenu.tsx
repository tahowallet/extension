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

  return (
    <div className="nav_wrap">
      <nav className="standard_width_padded">
        <TopMenuProtocolSwitcher onClick={toggleOpenProtocolList} />
        <button
          type="button"
          aria-label="Show current dApp connection"
          className="connection_button"
          onClick={toggleOpenDAppConnectionInfo}
        />
        <TopMenuProfileButton
          address={truncatedAddress}
          nickname={name || undefined}
          avatar={avatarURL || undefined}
          onClick={toggleOpenNotifications}
        />
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
          .connection_button {
            background: url("./images/bolt@2x.png") center no-repeat;
            border-radius: 5px;
            background-size: 14px 25px;
            border: solid 3px var(--hunter-green);
            width: 32px;
            height: 32px;
            margin-top: -5px;
          }
          .connection_button:hover {
            background-color: var(--green-80);
          }
        `}
      </style>
    </div>
  )
}
