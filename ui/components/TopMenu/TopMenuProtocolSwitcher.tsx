import React, { ReactElement } from "react"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

type Props = {
  onClick?: () => void
}

export default function TopMenuProtocolSwitcher({
  onClick,
}: Props): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  return (
    <button
      type="button"
      onClick={() => onClick?.()}
      data-testid="top_menu_network_switcher"
    >
      <div className="icon_wrap">
        <SharedNetworkIcon
          key={currentNetwork.chainID}
          size={18}
          network={currentNetwork}
        />
      </div>
      <div className="ellipsis" title={currentNetwork.name}>
        {currentNetwork.name}
      </div>
      <span className="icon_chevron_down" />
      <style jsx>
        {`
          button {
            color: var(--green-40);
            display: flex;
            align-items: center;
            user-select: none;
            white-space: nowrap;
            max-width: 60%;
          }
          button:hover {
            color: #fff;
          }
          .icon_chevron_down {
            flex-shrink: 0;
            mask-image: url("./images/chevron_down.svg");
            mask-size: 15px 8px;
            width: 15px;
            height: 8px;
            margin-left: 7px;
            margin-top: 2px;
            background-color: var(--green-40);
          }
          button:hover .icon_chevron_down {
            background-color: #fff;
          }
          .icon_wrap {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            background-color: var(--green-95);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 5px;
          }
          button:hover .icon_wrap {
            background-color: var(--green-80) !important;
          }
        `}
      </style>
    </button>
  )
}
