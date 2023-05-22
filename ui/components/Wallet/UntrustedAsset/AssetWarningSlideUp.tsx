import React, { ReactElement } from "react"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { useTranslation } from "react-i18next"
import { updateAssetTrustStatus } from "@tallyho/tally-background/redux-slices/assets"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import {
  selectShowUntrustedAssets,
  setSnackbarMessage,
} from "@tallyho/tally-background/redux-slices/ui"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { isUntrustedAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { DEFAULT_NETWORKS_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import SharedSlideUpMenu from "../../Shared/SharedSlideUpMenu"
import SharedButton from "../../Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import SharedSlideUpMenuPanel from "../../Shared/SharedSlideUpMenuPanel"
import SharedIcon from "../../Shared/SharedIcon"
import { scanWebsite } from "../../../utils/constants"
import UntrustedAssetBanner from "./UntrustedAssetBanner"

type AssetWarningSlideUpProps = {
  asset: SmartContractFungibleAsset
  close: () => void
}

export default function AssetWarningSlideUp(
  props: AssetWarningSlideUpProps
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.trustedAssets",
  })

  const { asset, close } = props

  const dispatch = useBackgroundDispatch()

  const showUntrusted = useBackgroundSelector(selectShowUntrustedAssets)

  const network = useBackgroundSelector(selectCurrentNetwork)

  const setAssetTrustStatus = async (isTrusted: boolean) => {
    await dispatch(updateAssetTrustStatus({ asset, trusted: isTrusted }))
    close()
  }

  const isUntrusted = isUntrustedAsset(asset)

  const contractAddress =
    asset && "contractAddress" in asset && asset.contractAddress
      ? asset.contractAddress
      : ""

  const discoveryTxHash = asset.metadata?.discoveryTxHash

  const handleCopyDiscoveryTxHash = (tx: string) => {
    navigator.clipboard.writeText(tx)
    dispatch(setSnackbarMessage(t("copiedTx")))
  }

  const scanWebsiteUrl = DEFAULT_NETWORKS_BY_CHAIN_ID.has(network.chainID)
    ? `${scanWebsite[network.chainID].url}/token/${contractAddress}`
    : network.blockExplorerURL

  return (
    <SharedSlideUpMenu
      isOpen={asset !== null}
      size="custom"
      customSize="350"
      close={close}
    >
      <SharedSlideUpMenuPanel header={t("assetImported")}>
        <div className="content">
          <div>
            <UntrustedAssetBanner
              title={t("banner.title")}
              description={t("banner.description")}
            />
            <ul className="asset_details">
              <li className="asset_symbol">
                <div className="left">{t("symbol")}</div>
                <div className="right ellipsis">{`${asset?.symbol}`}</div>
              </li>
              <li>
                <div className="left">{t("contract")}</div>
                <div className="right">
                  <button
                    type="button"
                    className="address_button"
                    onClick={() =>
                      window.open(scanWebsiteUrl, "_blank")?.focus()
                    }
                  >
                    {truncateAddress(contractAddress)}
                    <SharedIcon
                      width={16}
                      icon="icons/s/new-tab.svg"
                      color="var(--green-5)"
                      hoverColor="var(--trophy-gold)"
                      transitionHoverTime="0.2s"
                    />
                  </button>
                </div>
              </li>
              {discoveryTxHash && (
                <li>
                  <div className="left">{t("discoveryTxHash")}</div>
                  <div className="right">
                    <button
                      type="button"
                      className="address_button"
                      onClick={() => handleCopyDiscoveryTxHash(discoveryTxHash)}
                      title={discoveryTxHash}
                    >
                      {truncateAddress(discoveryTxHash)}
                    </button>
                  </div>
                </li>
              )}
            </ul>
          </div>
          <div>
            {isEnabled(FeatureFlags.SUPPORT_ASSET_TRUST) ? (
              <div className="asset_trust_actions">
                {showUntrusted ? (
                  <SharedButton size="medium" type="secondary" onClick={close}>
                    {t("close")}
                  </SharedButton>
                ) : (
                  <SharedButton
                    size="medium"
                    type="secondary"
                    onClick={() => {
                      if (isUntrusted) {
                        close()
                      } else {
                        setAssetTrustStatus(false)
                      }
                    }}
                  >
                    {isUntrusted ? t("keepHidden") : t("hideAsset")}
                  </SharedButton>
                )}
                <SharedButton
                  size="medium"
                  type="primary"
                  onClick={() => setAssetTrustStatus(true)}
                >
                  {t("trustAsset")}
                </SharedButton>
              </div>
            ) : (
              <SharedButton
                size="medium"
                type="secondary"
                id="close_asset_warning"
                onClick={close}
              >
                {t("close")}
              </SharedButton>
            )}
          </div>
        </div>
      </SharedSlideUpMenuPanel>
      <style jsx>{`
        .content {
          padding: 0 16px 16px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 271px;
        }
        ul.asset_details {
          display: block;
          margin-top: 16px;

          font-family: "Segment";
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
        ul.asset_details > li {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .left {
          color: var(--green-20);
        }
        .right {
          color: var(--green-5);
          width: 50%;
          text-align: right;
        }
        .asset_trust_actions {
          display: flex;
          justify-content: space-between;
        }
        .address_button {
          display: flex;
          align-items: center;
          justify-content: end;
          width: 100%;
          gap: 4px;
          transition: color 0.2s;
        }
        .address_button:hover {
          color: var(--trophy-gold);
        }
      `}</style>
      <style global jsx>
        {`
          .address_button:hover .icon {
            background-color: var(--trophy-gold);
          }
        `}
      </style>
    </SharedSlideUpMenu>
  )
}
