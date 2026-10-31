import React, { useCallback, ReactElement, useEffect, useState } from "react"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import {
  ActivityDetail,
  ActivityDetails,
  Activity,
  fetchSelectedActivityDetails,
} from "@tallyho/tally-background/redux-slices/activities"
import { useTranslation } from "react-i18next"
import SharedAddress from "../Shared/SharedAddress"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedBalanceChangesList from "../Shared/SharedBalanceChangesList"
import SharedActivityIcon from "../Shared/SharedActivityIcon"
import SharedIcon from "../Shared/SharedIcon"
import useActivityViewDetails from "../../hooks/activity-hooks"
import { getBlockExplorerURL } from "../../utils/networks"

function DetailRowItem(props: ActivityDetail): ReactElement {
  const { label, value } = props

  return (
    <li>
      <div className="label">{label}</div>
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

interface DestinationCardProps {
  label: string
  address: string
  name?: string | undefined
}

function DestinationCard(props: DestinationCardProps): ReactElement {
  const { label, address, name } = props

  return (
    <div className="card_wrap" data-testid="tx_participant_wrap">
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

interface WalletActivityDetailsProps {
  activityItem: Activity
  activityInitiatorAddress: string
}
// Include this "or" type to handle existing placeholder data
// on the single asset page. TODO: Remove once single asset page
// has real data

export default function WalletActivityDetails(
  props: WalletActivityDetailsProps,
): ReactElement {
  const { activityItem, activityInitiatorAddress } = props
  const dispatch = useBackgroundDispatch()
  const { t } = useTranslation("translation", {
    keyPrefix: "signTransaction",
  })
  const [details, setDetails] = useState<ActivityDetails | undefined>()
  const network = useBackgroundSelector(selectCurrentNetwork)

  const blockExplorerUrl = getBlockExplorerURL(network)

  const openExplorer = useCallback(() => {
    window
      .open(`${blockExplorerUrl}/tx/${activityItem.hash}`, "_blank")
      ?.focus()
  }, [activityItem?.hash, blockExplorerUrl])

  useEffect(() => {
    const fetchDetails = async () => {
      if (activityItem?.hash) {
        setDetails(
          (await dispatch(
            fetchSelectedActivityDetails(activityItem.hash),
          )) as unknown as ActivityDetails,
        )
      }
    }
    fetchDetails()
  }, [activityItem.hash, dispatch])

  const activityViewDetails = useActivityViewDetails(
    activityItem,
    activityInitiatorAddress,
  )

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
        {details === undefined &&
          Array.from({ length: 7 }).map(() => (
            <SharedSkeletonLoader
              height={24}
              style={{ margin: "10px 0 15px" }}
            />
          ))}
        {details?.rows.map(({ label, value }) => (
          <DetailRowItem key={label} label={label} value={value} />
        ))}
      </ul>
      {details !== undefined && (
        <div className="balance_changes">
          {/*
           * When a Safe transaction executes, both sides are listed even if
           * empty, so it's explicit whose balances were checked.
           */}
          <SharedBalanceChangesList
            label={t("yourAccountBalanceChanges")}
            transfers={details.balanceChanges.transfers}
            emptyMessage={
              details.safeBalanceChanges === undefined
                ? undefined
                : t("noBalanceChanges")
            }
          />
          {details.safeBalanceChanges !== undefined && (
            <SharedBalanceChangesList
              label={t("safeBalanceChanges")}
              transfers={details.safeBalanceChanges.transfers}
              emptyMessage={t("noBalanceChanges")}
            />
          )}
        </div>
      )}
      <style jsx>
        {`
          .wrap {
            margin-top: -24px;
          }
          .balance_changes {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin: 16px 0;
          }
          .balance_changes:empty {
            display: none;
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
        `}
      </style>
    </div>
  )
}
