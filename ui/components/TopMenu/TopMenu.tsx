import React, { ReactElement } from "react"
import TopMenuProtocolSwitcher from "./TopMenuProtocolSwitcher"
import TopMenuProfileButton from "./TopMenuProfileButton"
import { useBackgroundSelector } from "../../hooks"

interface Props {
  toggleOpenProtocolList: () => void
  toggleOpenNotifications: () => void
}

export default function TopMenu(props: Props): ReactElement {
  const { toggleOpenProtocolList, toggleOpenNotifications } = props

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
        `}
      </style>
    </div>
  )
}
