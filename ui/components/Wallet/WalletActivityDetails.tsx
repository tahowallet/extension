import React, { useCallback, ReactElement, useState } from "react"
import {
  selectCurrentAccount,
  selectCurrentAccountSigner,
  selectCurrentNetwork,
  selectTrackedReplacementTransactions,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  ActivityDetail,
  Activity,
  fetchSelectedActivityDetails,
  speedUpTx,
} from "@tallyho/tally-background/redux-slices/activities"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { AssetTransferDetail } from "@tallyho/tally-background/redux-slices/utils/activities-utils"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import SharedAddress from "../Shared/SharedAddress"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedActivityIcon from "../Shared/SharedActivityIcon"
import SharedIcon from "../Shared/SharedIcon"
import useActivityViewDetails from "../../hooks/activity-hooks"
import { getBlockExplorerURL } from "../../utils/networks"
import { useInterval } from "../../hooks/react-hooks"

function DetailRowItem(props: AssetTransferDetail): ReactElement {
  const { assetIconUrl, label, value } = props

  return (
    <li>
      <div className="label">
        {assetIconUrl === undefined ? (
          <></>
        ) : (
          <SharedAssetIcon symbol={label} logoURL={assetIconUrl} size={24} />
        )}
        {label}
      </div>
      <div className="right">{value}</div>
      <style jsx>
        {`
          li {
            width: 100%;
            border-bottom: 1px solid var(--hunter-green);
            display: flex;
            justify-content: space-between;
            padding: 7px 0px;
            height: 24px;
            align-items: center;
          }
          .label {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .right {
            float: right;
            display: flex;
            align-items: flex-end;
          }
          .value_detail {
            color: var(--green-40);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
        `}
      </style>
    </li>
  )
}

type DestinationCardProps = {
  label: string
  address: string
  name?: string | undefined
}

function DestinationCard(props: DestinationCardProps): ReactElement {
  const { label, address, name } = props

  return (
    <div className="card_wrap">
      <div className="sub_info from">{label}:</div>
      <SharedAddress address={address} name={name} alwaysShowAddress />
      <div className="sub_info name" />
      <style jsx>
        {`
          .card_wrap {
            width: 160px;
            height: 96px;
            border-radius: 4px;
            background-color: var(--hunter-green);
            box-sizing: border-box;
            padding: 15px;
            flex-grow: 1;
            flex-shrink: 0;
          }
          .sub_info {
            width: 69px;
            height: 17px;
            color: var(--green-40);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .from {
            margin-bottom: 3px;
          }
          .name {
            margin-top: 10px;
          }
        `}
      </style>
    </div>
  )
}

type WalletActivityDetailsProps = {
  activityItem: Activity
  activityInitiatorAddress: string
}
// Include this "or" type to handle existing placeholder data
// on the single asset page. TODO: Remove once single asset page
// has real data

export default function WalletActivityDetails(
  props: WalletActivityDetailsProps
): ReactElement {
  const { activityItem, activityInitiatorAddress } = props
  const dispatch = useBackgroundDispatch()
  const [details, setDetails] = useState<ActivityDetail>()

  const currentSigner = useBackgroundSelector(selectCurrentAccountSigner)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)

  const isReadOnlyAccount = currentSigner.type === "read-only"

  const isSentFromCurrentAccount = sameEVMAddress(
    activityItem.from,
    currentAccount.address
  )

  const replacementTransactions = useBackgroundSelector(
    selectTrackedReplacementTransactions
  )

  const hasReplacementTx = replacementTransactions.some(
    (tx) =>
      tx.parentTx === props.activityItem.hash &&
      tx.chainID === currentAccount.network.chainID
  )

  const isReplacementTx = replacementTransactions.some(
    (tx) =>
      tx.hash === props.activityItem.hash &&
      tx.chainID === currentAccount.network.chainID
  )

  const network = useBackgroundSelector(selectCurrentNetwork)

  const { t } = useTranslation("translation", {
    keyPrefix: "wallet",
  })

  const { t: sharedT } = useTranslation("translation", {
    keyPrefix: "shared",
  })

  const blockExplorerUrl = getBlockExplorerURL(network)

  const openExplorer = useCallback(() => {
    window
      .open(`${blockExplorerUrl}/tx/${activityItem.hash}`, "_blank")
      ?.focus()
  }, [activityItem?.hash, blockExplorerUrl])

  useInterval(() => {
    const fetchDetails = async () => {
      if (activityItem?.hash) {
        type SelectedActivityDetails = AsyncThunkFulfillmentType<
          typeof fetchSelectedActivityDetails
        >

        const [result] = (await dispatch(
          fetchSelectedActivityDetails(activityItem.hash)
        )) as unknown as SelectedActivityDetails

        setDetails(result)
      }
    }
    fetchDetails()
  }, 500)

  const activityViewDetails = useActivityViewDetails(
    activityItem,
    activityInitiatorAddress
  )

  const detailsItems = [
    {
      key: "timestamp",
      label: t("activityDetails.timestamp"),
      value: details?.timestamp,
    },
    {
      key: "blockHeight",
      label: t("activityDetails.blockHeight"),
      value: details?.blockHeight,
    },
    { key: "gas", label: t("activityDetails.gas"), value: details?.gas },
    { key: "nonce", label: t("activityDetails.nonce"), value: details?.nonce },
    {
      key: "gasPrice",
      label: t("activityDetails.gasPrice"),
      value: details?.gasPrice,
    },
    {
      key: "maxFeePerGas",
      label: t("activityDetails.maxFeePerGas"),
      value: details?.maxFeePerGas,
    },
    {
      key: "amount",
      label: t("activityDetails.amount"),
      value: details?.amount,
    },
  ]

  return (
    <div className="wrap standard_width center_horizontal">
      <div className="header">
        <SharedActivityIcon type={activityViewDetails.icon} size={16} />
        <span className="header_title">{activityViewDetails.label}</span>
        {blockExplorerUrl && (
          <SharedIcon
            icon="icons/s/new-tab.svg"
            width={16}
            color="var(--green-40)"
            hoverColor="var(--trophy-gold)"
            onClick={openExplorer}
          />
        )}
      </div>
      {isEnabled(FeatureFlags.SUPPORT_TRANSACTION_REPLACEMENT) && (
        <div className="tx_status_panel">
          <div className="tx_status_header">
            <span className="tx_status_panel_title">
              {t("activityDetails.statusPanel.title")}
            </span>
            <span className={classNames("tx_current_status", details?.state)}>
              {details?.state
                ? t(`activities.status.${details?.state}`)
                : "....."}
            </span>
          </div>
          <div className="tx_status_controls">
            {!isReadOnlyAccount &&
              isSentFromCurrentAccount &&
              details?.state === "pending" && (
                <button
                  type="button"
                  className="speed_up_tx_btn"
                  disabled={hasReplacementTx || isReplacementTx}
                  onClick={() => {
                    dispatch(speedUpTx(details.tx))
                  }}
                >
                  <SharedIcon
                    icon="icons/s/arrow-top-right.svg"
                    color="currentColor"
                    height={16}
                    width={16}
                  />
                  {t("activityDetails.actions.speedup")}
                </button>
              )}
          </div>
        </div>
      )}
      <div className="destination_cards">
        <DestinationCard label="From" address={activityItem.from} />
        <div className="icon_transfer" />
        <DestinationCard
          label="To"
          address={activityItem.recipient.address || "(Contract creation)"}
          name={activityItem.recipient.name}
        />
      </div>
      <ul>
        {details ? (
          <>
            {detailsItems.map(({ key, label, value }) => (
              <DetailRowItem
                key={key}
                label={label}
                value={value || sharedT("unknown")}
              />
            ))}
            {details.state === "completed" &&
              details.assetTransfers.map(({ assetIconUrl, label, value }) => (
                <DetailRowItem
                  key={label}
                  assetIconUrl={assetIconUrl}
                  label={label}
                  value={value}
                />
              ))}
          </>
        ) : (
          Array.from({ length: 7 }).map(() => (
            <SharedSkeletonLoader
              height={24}
              customStyles="margin: 10px 0 15px;"
            />
          ))
        )}
      </ul>
      <style jsx>
        {`
          .wrap {
            margin-top: -24px;
          }
          .destination_cards {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
          }
          .header {
            display: flex;
            align-items: center;
            margin: 18px 0;
          }
          .header_title {
            margin-left: 4px;
            margin-right: 8px;
            font-family: "Segment";
            font-style: normal;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
            color: var(--white);
          }
          .icon_transfer {
            background: url("./images/transfer@2x.png") center no-repeat;
            background-size: 11px 12px;
            width: 35px;
            height: 35px;
            border: 3px solid var(--green-95);
            background-color: var(--hunter-green);
            border-radius: 70%;
            margin: 0 auto;
            margin-left: -5px;
            margin-right: -5px;
            position: relative;
            flex-grow: 1;
            flex-shrink: 0;
          }

          .tx_status_panel {
            background: var(--green-80);
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            padding: 16px;
            margin-bottom: 16px;
          }

          .tx_status_header {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .tx_status_panel_title {
            color: var(--green-40);
            font-size: 14px;
            font-weight: 500;
            line-height: 16px;
            letter-spacing: 0.03em;
          }

          .tx_status_controls {
            display: flex;
            align-items: self-end;
          }

          .tx_current_status {
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            letter-spacing: 0em;
          }

          .speed_up_tx_btn:disabled {
            color: var(--green-60);
          }

          .speed_up_tx_btn {
            color: var(--success);
            display: flex;
            gap: 4px;
            align-items: center;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            letter-spacing: 0em;
          }

          .tx_current_status.pending {
            color: var(--attention);
          }

          .tx_current_status.completed {
            color: var(--success);
          }
          .tx_current_status.failed {
            color: var(--error);
          }
        `}
      </style>
    </div>
  )
}
