import React, { useCallback, ReactElement, useEffect, useState } from "react"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import {
  ActivityDetail,
  Activity,
  fetchSelectedActivityDetails,
} from "@tallyho/tally-background/redux-slices/activities"
import SharedButton from "../Shared/SharedButton"
import SharedAddress from "../Shared/SharedAddress"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import { scanWebsite } from "../../utils/constants"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedAssetIcon from "../Shared/SharedAssetIcon"

function DetailRowItem(props: ActivityDetail): ReactElement {
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

interface DestinationCardProps {
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

interface WalletActivityDetailsProps {
  activityItem: Activity
}
// Include this "or" type to handle existing placeholder data
// on the single asset page. TODO: Remove once single asset page
// has real data

export default function WalletActivityDetails(
  props: WalletActivityDetailsProps
): ReactElement {
  const { activityItem } = props
  const dispatch = useBackgroundDispatch()
  const [details, setDetails] = useState<ActivityDetail[]>([])
  const network = useBackgroundSelector(selectCurrentNetwork)

  const scanWebsiteInfo = scanWebsite[network.chainID]

  const openExplorer = useCallback(() => {
    window
      .open(`${scanWebsiteInfo.url}/tx/${activityItem.hash}`, "_blank")
      ?.focus()
  }, [activityItem?.hash, scanWebsiteInfo])

  useEffect(() => {
    const fetchDetails = async () => {
      if (activityItem?.hash) {
        setDetails(
          (await dispatch(
            fetchSelectedActivityDetails(activityItem.hash)
          )) as unknown as ActivityDetail[]
        )
      }
    }
    fetchDetails()
  }, [activityItem.hash, dispatch])

  if (!activityItem) return <></>

  return (
    <div className="wrap standard_width center_horizontal">
      <div className="header">
        {scanWebsiteInfo && (
          <div className="header_button">
            <SharedButton
              type="tertiary"
              size="medium"
              iconMedium="new-tab"
              onClick={openExplorer}
            >
              {scanWebsiteInfo?.title}
            </SharedButton>
          </div>
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
        {details.length ? (
          <></>
        ) : (
          Array.from({ length: 7 }).map(() => (
            <SharedSkeletonLoader
              height={24}
              customStyles="margin: 10px 0 15px;"
            />
          ))
        )}
        {details.map(({ assetIconUrl, label, value }) => {
          return (
            <DetailRowItem
              key={label}
              assetIconUrl={assetIconUrl}
              label={label}
              value={value}
            />
          )
        })}
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
            align-items: top;
            justify-content: space-between;
            width: 304px;
            margin-bottom: 10px;
          }
          .header_button {
            margin-top: 10px;
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
