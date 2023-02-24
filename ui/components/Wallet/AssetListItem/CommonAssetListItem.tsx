import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"

import { useTranslation } from "react-i18next"
import { isUntrustedAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { NETWORKS_SUPPORTING_SWAPS } from "@tallyho/tally-background/constants"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"
import SharedAssetIcon from "../../Shared/SharedAssetIcon"
import styles from "./styles"
import SharedIconRouterLink from "../../Shared/SharedIconRouterLink"
import { useBackgroundSelector } from "../../../hooks"
import { trimWithEllipsis } from "../../../utils/textUtils"

type CommonAssetListItemProps = {
  assetAmount: CompleteAssetAmount
  initializationLoadingTimeExpired: boolean
  onUntrustedAssetWarningClick?: (asset: CompleteAssetAmount["asset"]) => void
}

const MAX_SYMBOL_LENGTH = 10

export default function CommonAssetListItem(
  props: CommonAssetListItemProps
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.trustedAssets",
  })
  const {
    assetAmount,
    initializationLoadingTimeExpired,
    onUntrustedAssetWarningClick,
  } = props
  const isMissingLocalizedUserValue =
    typeof assetAmount.localizedMainCurrencyAmount === "undefined"
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const contractAddress =
    "contractAddress" in assetAmount.asset
      ? assetAmount.asset.contractAddress
      : undefined

  const assetIsUntrusted = isUntrustedAsset(assetAmount?.asset, selectedNetwork)

  return (
    <Link
      to={{
        pathname: "/singleAsset",
        state: assetAmount.asset,
      }}
    >
      <div className="asset_list_item">
        <div className="asset_left">
          <SharedAssetIcon
            logoURL={assetAmount?.asset?.metadata?.logoURL}
            symbol={assetAmount?.asset?.symbol}
          />
          <div className="asset_left_content">
            <div className="asset_amount">
              <span className="bold_amount_count">
                {assetAmount.localizedDecimalAmount}
              </span>
              <span title={assetAmount.asset.symbol}>
                {trimWithEllipsis(assetAmount.asset.symbol, MAX_SYMBOL_LENGTH)}
              </span>
            </div>

            {
              // @TODO don't fetch prices for untrusted assets in the first place
              // Only show prices for trusted assets
              assetIsUntrusted ||
              (initializationLoadingTimeExpired &&
                isMissingLocalizedUserValue) ? (
                <></>
              ) : (
                <div className="price">
                  {isMissingLocalizedUserValue ? (
                    <SharedLoadingSpinner size="small" />
                  ) : (
                    `$${assetAmount.localizedMainCurrencyAmount}`
                  )}
                </div>
              )
            }
          </div>
        </div>
        <div className="asset_right">
          <>
            {assetIsUntrusted && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  if (onUntrustedAssetWarningClick) {
                    onUntrustedAssetWarningClick(assetAmount.asset)
                  }
                }}
                className="untrusted_asset_icon"
              >
                {t("notTrusted")}
              </button>
            )}
            <SharedIconRouterLink
              path="/send"
              state={assetAmount.asset}
              iconClass="asset_icon_send"
            />
            {NETWORKS_SUPPORTING_SWAPS.has(selectedNetwork.chainID) && (
              <SharedIconRouterLink
                path="/swap"
                state={{
                  symbol: assetAmount.asset.symbol,
                  contractAddress,
                }}
                iconClass="asset_icon_swap"
              />
            )}
          </>
        </div>
      </div>
      <style jsx>{`
        ${styles}
        .price {
          height: 17px;
          display: flex;
          color: var(--green-40);
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.42px;
          line-height: 16px;
        }
      `}</style>
    </Link>
  )
}
