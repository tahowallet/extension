import React, { useCallback, ReactElement } from "react"
import { convertToEth } from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedActivityHeader from "../Shared/SharedActivityHeader"
import SharedButton from "../Shared/SharedButton"

interface DetailRowItemProps {
  label: string
  value: string
  valueDetail: string
}

function DetailRowItem(props: DetailRowItemProps): ReactElement {
  const { label, value, valueDetail } = props

  return (
    <li>
      {label}
      <div className="right">
        {value}
        <div className="value_detail">{valueDetail}</div>
      </div>
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
}

function DestinationCard(props: DestinationCardProps): ReactElement {
  const { label, address } = props

  return (
    <div className="card_wrap">
      <div className="sub_info from">{label}:</div>
      {address.slice(0, 6)}...{address.slice(37, 41)}
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

const renameAndPickKeys = (keysMap, activityItem) =>
  Object.keys(activityItem).reduce((previousValue, key) => {
    if (keysMap[key]) {
      return {
        ...previousValue,
        ...{
          [keysMap[key].readableName]: keysMap[key].tansformer(
            activityItem[key]
          ),
        },
      }
    }
    return previousValue
  }, {})

function ethTransformer(value) {
  return `${convertToEth(value)} ETH`
}

interface WalletActivityDetailsProps {
  activityItem: any
}

export default function WalletActivityDetails(
  props: WalletActivityDetailsProps
): ReactElement {
  const { activityItem } = props

  const account = useBackgroundSelector((background) => background.account)

  if (!activityItem) return <></>

  const isSent =
    activityItem.from.toLowerCase() ===
    Object.keys(account.accountsData)[0].toLowerCase()

  const headerTitle = `${!isSent ? "Received" : "Sent"} Asset`

  const keysMap = {
    blockHeight: {
      readableName: "Block Height",
      tansformer: (item) => item,
      detailTransformer: ethTransformer,
    },
    value: {
      readableName: "Amount",
      tansformer: ethTransformer,
      detailTransformer: ethTransformer,
    },
    gas: {
      readableName: "Gas",
      tansformer: ethTransformer,
      detailTransformer: ethTransformer,
    },
    maxFeePerGas: {
      readableName: "Max Fee/Gas",
      tansformer: ethTransformer,
      detailTransformer: ethTransformer,
    },
    gasPrice: {
      readableName: "Gas Price",
      tansformer: ethTransformer,
      detailTransformer: ethTransformer,
    },
  }
  const trimmedActivityItem = renameAndPickKeys(keysMap, activityItem)

  const openEtherscan = useCallback(() => {
    window
      .open(`https://etherscan.io/tx/${activityItem.hash}`, "_blank")
      .focus()
  }, [])

  return (
    <div className="wrap standard_width center_horizontal">
      <div className="header">
        <SharedActivityHeader label={headerTitle} activity="send" />
        <div className="header_button">
          <SharedButton
            type="tertiary"
            size="medium"
            label="Etherscan"
            icon="external"
            iconSize="large"
            onClick={openEtherscan}
          />
        </div>
      </div>
      <div className="destination_cards">
        <DestinationCard label="From" address={activityItem.from} />
        <div className="icon_transfer" />
        <DestinationCard label="To" address={activityItem.to} />
      </div>
      <ul>
        {activityItem &&
          Object.keys(trimmedActivityItem).map((key, index) => {
            return (
              <DetailRowItem
                key={index.toString()}
                label={key}
                value={trimmedActivityItem[key].toString()}
                valueDetail=""
              />
            )
          })}
      </ul>
      <div className="activity_log_wrap">
        <div className="activity_log_title">Activity Log</div>
        <ul>
          <li className="activity_log_item">
            <div className="activity_log_icon plus" />
            Tx created at 03:00 on 14/4/2021
          </li>
          <li className="activity_log_item">
            <div className="activity_log_icon arrow" />
            Tx submitted 03:01 on 14/4/2021
          </li>
          <li className="activity_log_item">
            <div className="activity_log_icon check" />
            Tx confirmed at 03:03 on 14/4/2021
          </li>
        </ul>
      </div>
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
          }
          .header_button {
            margin-top: 14px;
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
          .activity_log_title {
            height: 24px;
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-top: 27px;
            margin-bottom: 6px;
          }
          .activity_log_item {
            width: 100%;
            display: flex;
            align-items: center;
            height: 24px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            margin-bottom: 13px;
          }
          .activity_log_icon {
            mask-size: 12px 12px;
            width: 12px;
            height: 12px;
            margin-right: 8px;
            background-color: var(--green-60);
          }
          .plus {
            mask-image: url("./images/plus@2x.png");
            mask-size: cover;
            width: 17px;
            height: 17px;
            transform: translateX(-2.5px);
            margin-right: 3px;
          }
          .arrow {
            mask-image: url("./images/send@2x.png");
          }
          .check {
            mask-image: url("./images/check@2x.png");
            background-color: #22c480;
          }
          .activity_log_wrap {
            display: none;
          }
        `}
      </style>
    </div>
  )
}
