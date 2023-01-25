import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"

import { useTranslation } from "react-i18next"
import { isBuiltInNetworkBaseAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"
import SharedAssetIcon from "../../Shared/SharedAssetIcon"
import styles from "./styles"
import SharedIconRouterLink from "../../Shared/SharedIconRouterLink"
import { useBackgroundSelector } from "../../../hooks"

type CommonAssetListItemProps = {
  assetAmount: CompleteAssetAmount
  initializationLoadingTimeExpired: boolean
  onUntrustedAssetWarningClick?: (asset: CompleteAssetAmount["asset"]) => void
}

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

  // NB: non-base assets that don't have any token lists are considered
  // untrusted. Reifying base assets clearly will improve this check down the
  // road. Eventually, assets can be flagged as trusted by adding them to an
  // "internal" token list that users can export and share.
  const numTokenLists = assetAmount?.asset?.metadata?.tokenLists?.length ?? 0
  const baseAsset = isBuiltInNetworkBaseAsset(
    assetAmount?.asset,
    selectedNetwork
  )

  const contractAddress =
    "contractAddress" in assetAmount.asset
      ? assetAmount.asset.contractAddress
      : undefined

  const assetIsUntrusted = numTokenLists === 0 && !baseAsset

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
              <span>{assetAmount.asset.symbol}</span>
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
            <SharedIconRouterLink
              path="/swap"
              state={{
                symbol: assetAmount.asset.symbol,
                contractAddress,
              }}
              iconClass="asset_icon_swap"
            />
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
