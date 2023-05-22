import React, { ReactElement, useState } from "react"
import { useLocation } from "react-router-dom"
import {
  selectCurrentAccountActivities,
  selectCurrentAccountBalances,
  selectCurrentAccountSigner,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import {
  AnyAsset,
  isSmartContractFungibleAsset,
  SmartContractFungibleAsset,
} from "@tallyho/tally-background/assets"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { useTranslation } from "react-i18next"
import {
  DEFAULT_NETWORKS_BY_CHAIN_ID,
  NETWORKS_SUPPORTING_SWAPS,
} from "@tallyho/tally-background/constants"
import { isUntrustedAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { useBackgroundSelector } from "../hooks"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedButton from "../components/Shared/SharedButton"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import SharedBackButton from "../components/Shared/SharedBackButton"
import SharedTooltip from "../components/Shared/SharedTooltip"
import { scanWebsite } from "../utils/constants"
import AssetWarningSlideUp from "../components/Wallet/UntrustedAsset/AssetWarningSlideUp"
import AssetTrustToggler from "../components/Wallet/UntrustedAsset/AssetTrustToggler"

export default function SingleAsset(): ReactElement {
  const { t } = useTranslation()
  const location = useLocation<AnyAsset>()
  const locationAsset = location.state
  const { symbol } = locationAsset
  const contractAddress =
    "contractAddress" in locationAsset
      ? locationAsset.contractAddress
      : undefined

  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  const filteredActivities = useBackgroundSelector((state) =>
    (selectCurrentAccountActivities(state) ?? []).filter((activity) => {
      if (
        typeof contractAddress !== "undefined" &&
        contractAddress === activity.to
      ) {
        return true
      }
      switch (activity?.type) {
        case "asset-transfer":
        case "asset-approval":
          return activity.assetSymbol === symbol
        case "asset-swap":
          return (
            // TODO: this should recognize both assets of the swap but it is
            // ignored right now as swaps are recognized as contract interactions
            activity.assetSymbol === symbol
          )
        case "contract-interaction":
        case "contract-deployment":
        default:
          return false
      }
    })
  )

  const { asset, localizedMainCurrencyAmount, localizedDecimalAmount } =
    useBackgroundSelector((state) => {
      const balances = selectCurrentAccountBalances(state)

      if (typeof balances === "undefined") {
        return undefined
      }

      return balances.allAssetAmounts.find(({ asset: candidateAsset }) => {
        if (typeof contractAddress !== "undefined") {
          return (
            isSmartContractFungibleAsset(candidateAsset) &&
            sameEVMAddress(candidateAsset.contractAddress, contractAddress)
          )
        }
        return candidateAsset.symbol === symbol
      })
    }) ?? {
      asset: undefined,
      localizedMainCurrencyAmount: undefined,
      localizedDecimalAmount: undefined,
    }

  const isTokenListAsset = !!asset?.metadata?.tokenLists?.length
  const isUntrusted = isUntrustedAsset(asset)
  const [warnedAsset, setWarnedAsset] =
    useState<SmartContractFungibleAsset | null>(null)

  return (
    <>
      {warnedAsset && (
        <AssetWarningSlideUp
          asset={warnedAsset}
          close={() => {
            setWarnedAsset(null)
          }}
        />
      )}
      <div className="navigation standard_width_padded">
        <SharedBackButton path="/" />
        {!isTokenListAsset && asset && isSmartContractFungibleAsset(asset) && (
          <AssetTrustToggler
            text={
              isUntrusted
                ? t("assets.unverifiedAsset")
                : t("assets.verifiedByUser")
            }
            icon={`notif-${isUntrusted ? "attention" : "correct"}`}
            color="var(--green-20)"
            hoverColor="var(--white)"
            onClick={() => setWarnedAsset(asset)}
          />
        )}
      </div>
      {asset && (
        <div className="header standard_width_padded">
          <div className="left">
            <div className="asset_wrap">
              <SharedAssetIcon
                logoURL={asset?.metadata?.logoURL}
                symbol={asset?.symbol}
              />
              <span className="asset_name ellipsis">{symbol}</span>
              {contractAddress && (
                <SharedTooltip
                  width={155}
                  IconComponent={() => (
                    <a
                      className="new_tab_link"
                      href={
                        DEFAULT_NETWORKS_BY_CHAIN_ID.has(currentNetwork.chainID)
                          ? `${
                              scanWebsite[currentNetwork.chainID].url
                            }/token/${contractAddress}`
                          : currentNetwork.blockExplorerURL
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="icon_new_tab" />
                    </a>
                  )}
                >
                  {scanWebsite[currentNetwork.chainID]
                    ? t("assets.viewAsset", {
                        siteTitle: scanWebsite[currentNetwork.chainID].title,
                      })
                    : t("assets.openNetworkExplorer")}
                </SharedTooltip>
              )}
            </div>
            <div className="balance">{localizedDecimalAmount}</div>
            {localizedMainCurrencyAmount && (
              <div className="usd_value">${localizedMainCurrencyAmount}</div>
            )}
          </div>
          <div className="right">
            {isUntrusted && asset && isSmartContractFungibleAsset(asset) ? (
              <SharedButton
                type="primary"
                size="medium"
                onClick={() => setWarnedAsset(asset)}
              >
                {t("assets.verifyAsset")}
              </SharedButton>
            ) : (
              <>
                {currentAccountSigner !== ReadOnlyAccountSigner && (
                  <>
                    <SharedButton
                      type="primary"
                      size="medium"
                      iconSmall="send"
                      linkTo={{
                        pathname: "/send",
                        state: asset,
                      }}
                    >
                      {t("shared.send")}
                    </SharedButton>
                    {NETWORKS_SUPPORTING_SWAPS.has(currentNetwork.chainID) ? (
                      <SharedButton
                        type="primary"
                        size="medium"
                        iconSmall="swap"
                        linkTo={{
                          pathname: "/swap",
                          state: asset,
                        }}
                      >
                        {t("shared.swap")}
                      </SharedButton>
                    ) : (
                      <SharedTooltip
                        type="dark"
                        width={180}
                        height={48}
                        horizontalPosition="center"
                        verticalPosition="bottom"
                        customStyles={{ marginLeft: "0" }}
                        horizontalShift={94}
                        IconComponent={() => (
                          <SharedButton
                            type="primary"
                            size="medium"
                            isDisabled
                            iconSmall="swap"
                          >
                            {t("shared.swap")}
                          </SharedButton>
                        )}
                      >
                        <div className="centered_tooltip">
                          <div>{t("wallet.swapDisabledOne")}</div>
                          <div>{t("wallet.swapDisabledTwo")}</div>
                        </div>
                      </SharedTooltip>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <WalletActivityList activities={filteredActivities} />
      <style jsx>
        {`
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 24px;
          }
          .header .right {
            height: 95px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .asset_name {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-transform: uppercase;
            margin-left: 8px;
            max-width: 118px;
          }
          .asset_wrap {
            display: flex;
            align-items: center;
          }
          .balance {
            color: #fff;
            font-size: 36px;
            font-weight: 500;
            line-height: 48px;
          }
          .usd_value {
            width: 112px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 600;
            line-height: 24px;
          }
          .label_light {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-bottom: 8px;
          }
          .icon_new_tab {
            mask-image: url("./images/new_tab@2x.png");
            mask-size: cover;
            width: 16px;
            height: 16px;
            background-color: var(--green-40);
            margin: 0 5px;
          }
          .new_tab_link:hover .icon_new_tab {
            background-color: var(--trophy-gold);
          }
          .navigation {
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
          }
        `}
      </style>
    </>
  )
}
