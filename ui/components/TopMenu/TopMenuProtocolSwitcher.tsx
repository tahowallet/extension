import React, { ReactElement } from "react"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { selectIsCurrentNetworkUnreachable } from "@tallyho/tally-background/redux-slices/selectors/networks"
import { useBackgroundSelector } from "../../hooks"
import NetworkUnreachableWarning from "../Shared/NetworkUnreachableWarning"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

type Props = {
  onClick?: () => void
}

export default function TopMenuProtocolSwitcher({
  onClick,
}: Props): ReactElement {
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const isUnreachable = useBackgroundSelector(selectIsCurrentNetworkUnreachable)

  return (
    <div className="switcher_wrap">
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
      </button>
      {/*
       * A sigil over the logo, but a sibling of the button rather than a
       * child: its tooltip holds a link, and a link inside a button both nests
       * badly and would open the network list on its way to the settings page.
       *
       * Not pushed down into SharedNetworkIcon either, which also draws list
       * rows, asset icons and the signing header — a sigil added there would
       * turn up in all of them.
       */}
      {isUnreachable && (
        <NetworkUnreachableWarning
          size={12}
          style={{
            margin: 0,
            position: "absolute",
            left: 14,
            top: "calc(50% + 4px)",
          }}
          tooltipHorizontalPosition="right"
        />
      )}
      <style jsx>
        {`
          .switcher_wrap {
            position: relative;
            display: flex;
            align-items: center;
            max-width: 60%;
          }
          button {
            color: var(--green-40);
            display: flex;
            align-items: center;
            user-select: none;
            white-space: nowrap;
            min-width: 0;
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
            position: relative;
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
    </div>
  )
}
