import React, { ReactElement } from "react"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"

type Props = {
  onClick?: () => void
}

export default function TopMenuProtocolSwitcher({
  onClick,
}: Props): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  return (
    <button type="button" onClick={() => onClick?.()}>
      <div className="icon_wrap">
        <span className="icon" />
      </div>
      {currentNetwork.name}
      <span className="icon_chevron_down" />
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
          .icon {
            background: url("./images/networks/${currentNetwork.name
              .replaceAll(" ", "")
              .toLowerCase()}-square@2x.png");
            background-size: cover;
            height: 18px;
            width: 18px;
            border-radius: 4px;
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
