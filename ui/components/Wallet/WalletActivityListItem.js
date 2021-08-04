import React from "react"
import PropTypes from "prop-types"
import moment from "moment"

export default function WalletActivityListItem(props) {
  const { onClick, activity } = props

  return (
    <li>
      <button type="button" onClick={onClick}>
        <div className="top">
          <div className="left">
            <div className="activity_icon" />
            Receive
          </div>
          <div className="right">
            {moment.unix(activity.timeStamp).format("MMM D")}
          </div>
        </div>
        <div className="bottom">
          <div className="left">
            <div className="token_icon_wrap">
              <span className="icon_eth" />
            </div>
            <div className="amount">
              <span className="bold_amount_count">
                {activity.value && `${activity.value}`.substring(0, 6)}
              </span>
              ETH
            </div>
          </div>
          <div className="right">
            <div className="outcome">
              From:
              {` ${activity.from.slice(0, 6)}...${activity.from.slice(37, 41)}`}
            </div>
          </div>
        </div>
      </button>
      <style jsx>
        {`
          button {
            width: 352px;
            height: 72px;
            border-radius: 16px;
            background-color: var(--green-95);
            display: flex;
            flex-direction: column;
            padding: 13px 19px 8px 8px;
            box-sizing: border-box;
            margin-bottom: 16px;
            justify-content: space-between;
            align-items: center;
          }
          button:hover {
            background-color: var(--green-80);
          }
          .activity_icon {
            background: url("./images/activity_receive@2x.png");
            background-size: 14px 14px;
            width: 14px;
            height: 14px;
            margin-right: 4px;
            margin-left: 9px;
          }
          .top {
            height: 16px;
            color: var(--green-40);
            font-family: Segment;
            font-size: 12px;
            font-weight: 500;
            line-height: 16px;
            display: flex;
            justify-content: space-between;
            width: 100%;
            align-items: center;
          }
          .bottom {
            display: flex;
            width: 100%;
            justify-content: space-between;
            align-items: center;
          }
          .left {
            display: flex;
            align-items: center;
          }
          .token_icon_wrap {
            width: 32px;
            height: 32px;
            background-color: var(--hunter-green);
            border-radius: 80px;
            margin-right: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon_eth {
            background: url("./images/eth@2x.png");
            background-size: 18px 29px;
            width: 18px;
            height: 29px;
            transform: scale(0.8);
          }
          .amount {
            color: #fefefc;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-transform: uppercase;
          }
          .bold_amount_count {
            width: 70px;
            height: 24px;
            color: #fefefc;
            font-family: Segment;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-right: 4px;
          }
          .price {
            width: 58px;
            height: 17px;
            color: var(--green-40);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .icon_send_asset {
            background: url("./images/send_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .icon_swap_asset {
            background: url("./images/swap_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .right {
            display: flex;
            justify-content: space-between;
            text-align: right;
          }
          .outcome {
            width: 200px;
            color: var(--green-5);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            text-align: right;
          }
        `}
      </style>
    </li>
  )
}

WalletActivityListItem.propTypes = {
  onClick: PropTypes.func.isRequired,
  activity: PropTypes.shape({
    timeStamp: PropTypes.string,
    value: PropTypes.string,
    from: PropTypes.string,
  }).isRequired,
}
