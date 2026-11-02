import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"

import { useTranslation } from "react-i18next"
import {
  getFullAssetID,
  isTrustedAsset,
  isUntrustedAsset,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { networkSupportsSwaps } from "@tallyho/tally-background/lib/0x-swap"
import {
  isSmartContractFungibleAsset,
  SmartContractFungibleAsset,
  SwappableAsset,
} from "@tallyho/tally-background/assets"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"
import SharedAssetIcon from "../../Shared/SharedAssetIcon"
import styles from "./styles"
import SharedIconRouterLink from "../../Shared/SharedIconRouterLink"
import { useBackgroundSelector } from "../../../hooks"
import { trimWithEllipsis } from "../../../utils/textUtils"
import { displayAssetAmount } from "../../../utils/amounts"
import SharedTooltip from "../../Shared/SharedTooltip"
import AssetVerifyToggler from "../UnverifiedAsset/AssetVerifyToggler"

type CommonAssetListItemProps = {
  assetAmount: CompleteAssetAmount<SwappableAsset>
  initializationLoadingTimeExpired: boolean
  onUnverifiedAssetWarningClick?: (
    asset: CompleteAssetAmount<SmartContractFungibleAsset>["asset"],
  ) => void
}

const MAX_SYMBOL_LENGTH = 10

export default function CommonAssetListItem(
  props: CommonAssetListItemProps,
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet",
  })
  const {
    assetAmount,
    initializationLoadingTimeExpired,
    onUnverifiedAssetWarningClick,
  } = props
  const isMissingLocalizedUserValue =
    typeof assetAmount.localizedMainCurrencyAmount === "undefined"
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  // Network base assets can carry a contract address of their own---MATIC on
  // Polygon and ETH on Optimism both do---so only pass the address along when
  // the asset really is a token; otherwise the swap page would look for a
  // token that does not exist instead of preselecting the base asset.
  const contractAddress = isSmartContractFungibleAsset(assetAmount.asset)
    ? assetAmount.asset.contractAddress
    : undefined

  const isUntrusted = isUntrustedAsset(assetAmount.asset)
  const amount = displayAssetAmount(assetAmount)

  const handleVerifyAsset = () => {
    if (
      isSmartContractFungibleAsset(assetAmount.asset) &&
      onUnverifiedAssetWarningClick
    ) {
      onUnverifiedAssetWarningClick(assetAmount.asset)
    }
  }

  return (
    <div
      className="asset_list_item"
      data-testid="asset_list_item"
      data-assetid={getFullAssetID(assetAmount.asset)}
      data-trusted={isTrustedAsset(assetAmount.asset)}
    >
      <Link
        className="asset_link"
        to={{
          pathname: "/singleAsset",
          state: assetAmount.asset,
        }}
      >
        <div className="asset_left">
          <SharedAssetIcon
            logoURL={assetAmount?.asset?.metadata?.logoURL}
            symbol={assetAmount?.asset?.symbol}
            untrusted={isUntrusted}
          />
          <div className="asset_left_content">
            <div className="asset_amount">
              <span
                className="bold_amount_count"
                data-testid="asset_amount"
                title={amount.title}
              >
                {amount.text}
              </span>
              <span
                className="asset_symbol"
                title={assetAmount.asset.symbol}
                data-testid="asset_symbol"
              >
                {trimWithEllipsis(assetAmount.asset.symbol, MAX_SYMBOL_LENGTH)}
              </span>
            </div>

            {
              // @TODO don't fetch prices for untrusted assets in the first place
              // Only show prices for trusted or verified assets
              isTrustedAsset(assetAmount.asset) &&
                !(
                  initializationLoadingTimeExpired &&
                  isMissingLocalizedUserValue
                ) && (
                  <div className="price">
                    {isMissingLocalizedUserValue ? (
                      <SharedLoadingSpinner size="small" />
                    ) : (
                      <span data-testid="resolved_asset_price">
                        {`$${assetAmount.localizedMainCurrencyAmount}`}
                      </span>
                    )}
                  </div>
                )
            }
          </div>
        </div>
      </Link>
      <div className="asset_right">
        {isUntrusted ? (
          <AssetVerifyToggler
            text={t("unverifiedAssets.verifyAsset")}
            icon="notif-attention"
            color="var(--attention)"
            hoverColor="var(--white)"
            onClick={handleVerifyAsset}
          />
        ) : (
          <>
            <SharedIconRouterLink
              path="/send"
              state={assetAmount.asset}
              iconClass="asset_icon_send"
              isTooltip
              tooltipText="Send"
            />
            {networkSupportsSwaps(selectedNetwork.chainID) ? (
              <SharedIconRouterLink
                path="/swap"
                state={{
                  symbol: assetAmount.asset.symbol,
                  contractAddress,
                }}
                iconClass="asset_icon_swap"
                isTooltip
                tooltipText="Swap"
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
                      state={{
                        symbol: assetAmount.asset.symbol,
                        contractAddress,
                      }}
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
          </>
        )}
      </div>
      {/*
       * styled-jsx glues the interpolated styles onto the next selector as an
       * ancestor, so that rule must not target the row itself.
       */}
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
        .centered_tooltip {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .asset_list_item {
          position: relative;
          padding: 0 16px 0 0;
        }
        .asset_list_item :global(.asset_link) {
          display: flex;
          align-items: center;
          align-self: stretch;
          flex-grow: 1;
          /* Shrink past the content so the quick links stay in the row. */
          min-width: 0;
          padding-left: 16px;
          outline: none;
        }
        /* The link covers the row; its content and the quick links sit above. */
        .asset_list_item :global(.asset_link::after) {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 16px;
        }
        .asset_list_item :global(.asset_link:focus-visible::after) {
          outline: auto;
        }
        .asset_left {
          position: relative;
          z-index: var(--z-raised);
        }
        .asset_right {
          pointer-events: none;
        }
        .asset_right :global(a),
        .asset_right :global(button),
        .asset_right :global(.icon_wrapper) {
          position: relative;
          z-index: var(--z-raised);
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
