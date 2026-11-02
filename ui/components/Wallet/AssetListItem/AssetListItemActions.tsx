import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { networkSupportsSwaps } from "@tallyho/tally-background/lib/0x-swap"
import {
  isSmartContractFungibleAsset,
  SwappableAsset,
} from "@tallyho/tally-background/assets"
import SharedIconRouterLink from "../../Shared/SharedIconRouterLink"
import SharedTooltip from "../../Shared/SharedTooltip"

type Props = {
  asset: SwappableAsset
  network: EVMNetwork
  /**
   * If provided, called with the link's path and state in place of following
   * the link. This is for callers that need to do some work before
   * navigating, for example selecting the account the action applies to.
   */
  onNavigate?: (pathname: string, state: { [key: string]: unknown }) => void
}

/**
 * Renders the send and swap quick links for an asset row. If swaps aren't
 * supported on the given network, the swap link is disabled and shows a
 * tooltip explaining why.
 */
export default function AssetListItemActions({
  asset,
  network,
  onNavigate,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "wallet" })

  // Network base assets can carry a contract address of their own---MATIC on
  // Polygon and ETH on Optimism both do---so only pass the address along when
  // the asset really is a token; otherwise the swap page would look for a
  // token that does not exist instead of preselecting the base asset.
  const swapState = {
    symbol: asset.symbol,
    contractAddress: isSmartContractFungibleAsset(asset)
      ? asset.contractAddress
      : undefined,
  }

  const navigateHandler =
    onNavigate &&
    ((pathname: string, state: { [key: string]: unknown }) =>
      (event: React.MouseEvent) => {
        event.preventDefault()
        onNavigate(pathname, state)
      })

  return (
    <>
      <SharedIconRouterLink
        path="/send"
        state={asset}
        iconClass="asset_icon_send"
        isTooltip
        tooltipText="Send"
        onClick={navigateHandler?.("/send", asset)}
      />
      {networkSupportsSwaps(network.chainID) ? (
        <SharedIconRouterLink
          path="/swap"
          state={swapState}
          iconClass="asset_icon_swap"
          isTooltip
          tooltipText="Swap"
          onClick={navigateHandler?.("/swap", swapState)}
        />
      ) : (
        <SharedTooltip
          type="dark"
          width={180}
          height={48}
          horizontalPosition="left"
          verticalPosition="bottom"
          horizontalShift={42}
          verticalShift={16}
          IconComponent={() => (
            <div className="button_wrap">
              <SharedIconRouterLink
                path="/swap"
                disabled
                state={swapState}
                iconClass="asset_icon_swap"
              />
            </div>
          )}
        >
          <div className="centered_tooltip">
            <div>{t("swapDisabledOne")}</div>
            <div>{t("swapDisabledTwo")}</div>
          </div>
        </SharedTooltip>
      )}
      <style jsx>{`
        .centered_tooltip {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
      `}</style>
      {/* Icons take their color from the `--asset-icon-color` variable of
          the row they sit in, falling back to the default icon color. */}
      <style jsx global>{`
        .asset_icon {
          mask-size: cover;
          background-color: var(--asset-icon-color, var(--green-60));
          width: 12px;
          height: 12px;
          transition: background-color var(--fade);
        }
        .asset_icon_send {
          mask-image: url("./images/send_asset.svg");
        }
        .asset_icon_swap {
          mask-image: url("./images/swap_asset.svg");
        }
      `}</style>
    </>
  )
}
