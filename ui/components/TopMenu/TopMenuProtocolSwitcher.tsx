import React, { ReactElement } from "react"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { MULTI_NETWORK } from "@tallyho/tally-background/features"
import { useBackgroundSelector } from "../../hooks"

type Props = {
  onClick?: () => void
}

export default function TopMenuProtocolSwitcher({
  onClick,
}: Props): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  return (
    <button type="button" onClick={() => MULTI_NETWORK && onClick?.()}>
      {currentNetwork.name}
      {MULTI_NETWORK && <span className="icon_chevron_down" />}
      <style jsx>
        {`
          button {
            color: var(--green-40);
            display: flex;
            align-items: center;
            user-select: none;
          }
          button:hover {
            color: #fff;
          }
          .icon_chevron_down {
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
        `}
      </style>
    </button>
  )
}
