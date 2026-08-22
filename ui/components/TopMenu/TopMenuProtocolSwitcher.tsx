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
        /*
         * An overlay the size of the logo, so the sigil hangs off the logo's
         * own corner rather than off this wrapper — which is as wide as the
         * network name and the chevron besides. Only the sigil inside it takes
         * a pointer; the overlay itself must not, or it would sit over the
         * button and swallow clicks meant for the network list.
         */
        <div className="logo_overlay">
          <NetworkUnreachableWarning
            chainID={currentNetwork.chainID}
            size={18}
            style={{
              position: "absolute",
              /*
               * Where the drawing lands, arrived at by looking at renders
               * rather than by arithmetic — which is why the two offsets are
               * not the same number, and why neither is round.
               *
               * `SharedTooltip` pads its wrapper five pixels above and below
               * and it is the wrapper a caller positions, so the padding goes
               * to zero: otherwise the offsets place the padding rather than
               * the sigil, and the sigil holds pointer events over half again
               * as much of the logo as it draws on.
               */
              padding: 0,
              bottom: -4,
              right: -9,
              pointerEvents: "auto",
            }}
            tooltipHorizontalPosition="right"
          />
        </div>
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
          .logo_overlay {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 24px;
            height: 24px;
            pointer-events: none;
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
    </div>
  )
}
