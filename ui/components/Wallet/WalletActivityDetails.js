import React from "react"
import PropTypes from "prop-types"
import SharedActivityHeader from "../Shared/SharedActivityHeader"
import SharedButton from "../Shared/SharedButton"

function DetailRowItem(props) {
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

DetailRowItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  valueDetail: PropTypes.string.isRequired,
}

function DestinationCard() {
  return (
    <div className="card_wrap">
      <div className="sub_info from">From:</div>
      0x23kj...238y
      <div className="sub_info name">Foxhunter</div>
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

const DetailInfo = [
  {
    label: "Timestamp",
    value: "03:00:12 PM",
    valueDetail: "May-14-2021",
  },
  {
    label: "Amount",
    value: "0.342 ETH",
    valueDetail: "($1409.11)",
  },
  {
    label: "Transaction Fee",
    value: "0.00508 ETH",
    valueDetail: "($28,11)",
  },
  {
    label: "Gas Price",
    value: "0.00000012 ETH",
    valueDetail: "(120 Gwei)",
  },
  {
    label: "Total",
    value: "0.347 ETH",
    valueDetail: "($1437.11)",
  },
]

export default function WalletActivityDetails() {
  return (
    <div className="wrap center_horizontal">
      <div className="header">
        <SharedActivityHeader label="Send Asset" activity="send" />
        <div className="header_button">
          <SharedButton
            type="tertiary"
            size="medium"
            label="Etherscan"
            icon="external"
            iconSize="large"
          />
        </div>
      </div>
      <div className="destination_cards">
        <DestinationCard />
        <div className="icon_transfer" />
        <DestinationCard />
      </div>
      <ul>{DetailInfo.map(DetailRowItem)}</ul>
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
            width: 352px;
            margin-top: -24px;
          }
          .destination_cards {
            display: flex;
            align-items: center;
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
        `}
      </style>
    </div>
  )
}
