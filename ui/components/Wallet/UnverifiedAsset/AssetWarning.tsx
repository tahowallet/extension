import React, { ReactElement } from "react"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { useTranslation } from "react-i18next"
import {
  hideAsset,
  updateAssetMetadata,
} from "@tallyho/tally-background/redux-slices/assets"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import {
  selectCurrentAccount,
  selectCurrentAccountActivities,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import classNames from "classnames"
import { isUnverifiedAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useHistory, useLocation } from "react-router-dom"
import { Activity } from "@tallyho/tally-background/redux-slices/activities"
import SharedButton from "../../Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import SharedSlideUpMenuPanel from "../../Shared/SharedSlideUpMenuPanel"
import SharedIcon from "../../Shared/SharedIcon"
import UnverifiedAssetBanner from "./UnverifiedAssetBanner"
import { getBlockExplorerURL } from "../../../utils/networks"

type AssetWarningProps = {
  asset: SmartContractFungibleAsset
  close: () => void
  openActivityDetails: (activityDetails: {
    activityItem: Activity
    activityInitiatorAddress: string
  }) => void
}

export default function AssetWarning(props: AssetWarningProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.verifiedAssets",
  })
  const { t: sharedT } = useTranslation("translation", {
    keyPrefix: "shared",
  })

  const { asset, close, openActivityDetails } = props

  const dispatch = useBackgroundDispatch()

  const history = useHistory()

  const { pathname } = useLocation()

  const network = useBackgroundSelector(selectCurrentNetwork)

  const isUnverified = isUnverifiedAsset(asset)

  const contractAddress =
    asset && "contractAddress" in asset && asset.contractAddress
      ? asset.contractAddress
      : ""

  const blockExplorerUrl = getBlockExplorerURL(network)

  const handleVerifyAsset = async () => {
    const metadata = { ...asset.metadata, verified: true }
    await dispatch(updateAssetMetadata({ asset, metadata }))
    dispatch(setSnackbarMessage(t("verifyAssetSnackbar")))
    close()
  }

  const handleHideAsset = async () => {
    await dispatch(hideAsset({ asset }))
    dispatch(setSnackbarMessage(t("removeAssetSnackbar")))
    close()

    if (pathname === "/singleAsset") {
      history.push("/")
    }
  }

  const activityInitiatorAddress =
    useBackgroundSelector(selectCurrentAccount).address

  const discoveryTxHash =
    asset.metadata?.discoveryTxHash?.[activityInitiatorAddress]

  const currentAccountActivities = useBackgroundSelector(
    selectCurrentAccountActivities
  )
  const activityItem = discoveryTxHash
    ? currentAccountActivities.find(({ hash }) => hash === discoveryTxHash)
    : undefined

  return (
    <SharedSlideUpMenuPanel header={t("assetImported")}>
      <div className="content">
        <div>
          <UnverifiedAssetBanner
            title={
              isUnverified
                ? t("banner.titleUnverified")
                : t("banner.titleVerified")
            }
            description={
              isEnabled(FeatureFlags.SUPPORT_UNVERIFIED_ASSET)
                ? t("banner.description")
                : t("banner.oldDescription")
            }
          />
          <ul className="asset_details">
            <li className="asset_symbol">
              <div className="left">{t("symbol")}</div>
              <div
                className="right ellipsis"
                title={asset?.symbol}
              >{`${asset?.symbol}`}</div>
            </li>
            <li>
              <div className="left">{t("contract")}</div>
              <div className="right">
                <div className="address_button_wrap">
                  <button
                    type="button"
                    className={classNames("address_button", {
                      no_click: !blockExplorerUrl,
                    })}
                    disabled={!blockExplorerUrl}
                    onClick={() =>
                      window
                        .open(
                          `${blockExplorerUrl}/token/${contractAddress}`,
                          "_blank"
                        )
                        ?.focus()
                    }
                  >
                    {truncateAddress(contractAddress)}
                    {blockExplorerUrl && (
                      <SharedIcon
                        width={16}
                        icon="icons/s/new-tab.svg"
                        color="var(--green-5)"
                        hoverColor="var(--trophy-gold)"
                        transitionHoverTime="0.2s"
                      />
                    )}
                  </button>
                </div>
              </div>
            </li>
            {discoveryTxHash && (
              <li>
                <div className="left">{t("discoveryTxHash")}</div>
                <div className="right">
                  <div className="address_button_wrap">
                    <button
                      type="button"
                      className={classNames("address_button", {
                        no_click: activityItem ? false : !blockExplorerUrl,
                      })}
                      onClick={() => {
                        if (activityItem) {
                          openActivityDetails({
                            activityItem,
                            activityInitiatorAddress,
                          })
                        } else {
                          window
                            .open(
                              `${blockExplorerUrl}/tx/${discoveryTxHash}`,
                              "_blank"
                            )
                            ?.focus()
                        }
                      }}
                      title={discoveryTxHash}
                    >
                      {truncateAddress(discoveryTxHash)}
                      {!activityItem && blockExplorerUrl && (
                        <SharedIcon
                          width={16}
                          icon="icons/s/new-tab.svg"
                          color="var(--green-5)"
                          hoverColor="var(--trophy-gold)"
                          transitionHoverTime="0.2s"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            )}
          </ul>
        </div>
        <div>
          <div className="asset_verify_actions">
            {isEnabled(FeatureFlags.SUPPORT_UNVERIFIED_ASSET) ? (
              <>
                <SharedButton
                  size="medium"
                  type="secondary"
                  onClick={() => handleHideAsset()}
                >
                  {t("dontShow")}
                </SharedButton>
                {isUnverified && (
                  <SharedButton
                    size="medium"
                    type="primary"
                    onClick={() => handleVerifyAsset()}
                  >
                    {t("addToAssetList")}
                  </SharedButton>
                )}
              </>
            ) : (
              <SharedButton size="medium" type="secondary" onClick={close}>
                {sharedT("close")}
              </SharedButton>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .content {
          padding: 0 16px 16px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 82%;
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
        .asset_verify_actions {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
        }
        .address_button_wrap {
          display: flex;
          justify-content: end;
          width: 100%;
        }
        .address_button {
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.2s;
        }
        .address_button:hover {
          color: var(--trophy-gold);
        }
        .address_button .no_click {
          pointer-events: none;
        }
      `}</style>
      <style global jsx>
        {`
          .address_button:hover .icon {
            background-color: var(--trophy-gold);
          }
        `}
      </style>
    </SharedSlideUpMenuPanel>
  )
}
