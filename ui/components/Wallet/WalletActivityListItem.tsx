import React, { ReactElement } from "react"
import dayjs from "dayjs"
import classNames from "classnames"
import { ActivityItem } from "@tallyho/tally-background/redux-slices/activities"
import {
  isMaxUint256,
  sameEVMAddress,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import { HexString } from "@tallyho/tally-background/types"
import { getRecipient } from "@tallyho/tally-background/redux-slices/utils/activity-utils"
import SharedAssetIcon from "../Shared/SharedAssetIcon"

interface Props {
  onClick: () => void
  activity: ActivityItem
  asAccount: string
}

function isReceiveActivity(activity: ActivityItem, account: string): boolean {
  return (
    activity.annotation?.type === "asset-transfer" &&
    sameEVMAddress(activity.annotation?.recipient?.address, account)
  )
}

function isSendActivity(activity: ActivityItem, account: string): boolean {
  return activity.annotation?.type === "asset-transfer"
    ? sameEVMAddress(activity.annotation?.sender?.address, account)
    : true
}

export default function WalletActivityListItem(props: Props): ReactElement {
  const { onClick, activity, asAccount } = props

  // TODO Replace this with better conditional rendering.
  let renderDetails: {
    iconClass: string | undefined
    label: string
    recipient: {
      address: HexString | undefined
      name?: string | undefined
    }
    assetLogoURL: string | undefined
    assetSymbol: string
    assetValue: string
  } = {
    iconClass: undefined,
    label: "Contract interaction",
    recipient: getRecipient(activity),
    assetLogoURL: undefined,
    assetSymbol: activity.asset.symbol,
    assetValue: activity.localizedDecimalValue,
  }

  switch (activity.annotation?.type) {
    case "asset-transfer":
      renderDetails = {
        ...renderDetails,
        label: isReceiveActivity(activity, asAccount) ? "Received" : "Send",
        iconClass: isReceiveActivity(activity, asAccount)
          ? "receive_icon"
          : "send_icon",
        assetLogoURL: activity.annotation.transactionLogoURL,
        assetSymbol: activity.annotation.assetAmount.asset.symbol,
        assetValue: activity.annotation.assetAmount.localizedDecimalAmount,
      }
      break
    case "asset-approval":
      renderDetails = {
        label: "Token approval",
        iconClass: "approve_icon",
        recipient: {
          address: activity.annotation.spender.address,
          name: activity.annotation.spender.annotation.nameOnNetwork?.name,
        },
        assetLogoURL: activity.annotation.transactionLogoURL,
        assetSymbol: activity.annotation.assetAmount.asset.symbol,
        assetValue: isMaxUint256(activity.annotation.assetAmount.amount)
          ? "Infinite"
          : activity.annotation.assetAmount.localizedDecimalAmount,
      }
      break
    case "asset-swap":
      renderDetails = {
        iconClass: "swap_icon",
        label: "Swap",
        recipient: getRecipient(activity),
        assetLogoURL: activity.annotation.transactionLogoURL,
        assetSymbol: activity.asset.symbol,
        assetValue: activity.localizedDecimalValue,
      }
      break
    case "contract-deployment":
    case "contract-interaction":
    default:
      renderDetails = {
        iconClass: "contract_interaction_icon",
        label: "Contract Interaction",
        recipient: getRecipient(activity),
        // TODO fall back to the asset URL we have in metadata
        assetLogoURL: activity.annotation?.transactionLogoURL,
        assetSymbol: activity.asset.symbol,
        assetValue: activity.localizedDecimalValue,
      }
  }

  return (
    <li>
      <button type="button" className="standard_width" onClick={onClick}>
        <div className="top">
          <div className="left">
            <div
              className={classNames("activity_icon", renderDetails.iconClass)}
            />
            {renderDetails.label}
            {"status" in activity &&
            activity.blockHash !== null &&
            activity.status !== 1 ? (
              <div className="status failed">Failed</div>
            ) : (
              <></>
            )}
            {"status" in activity &&
            activity.blockHash === null &&
            activity.status === 0 ? (
              <div className="status dropped">Dropped</div>
            ) : (
              <></>
            )}
            {!("status" in activity) && activity.blockHash === null ? (
              <div className="status pending">Pending...</div>
            ) : (
              <></>
            )}
          </div>
          <div className="right">
            {activity.annotation?.blockTimestamp &&
              dayjs.unix(activity.annotation?.blockTimestamp).format("MMM D")}
          </div>
        </div>
        <div className="bottom">
          <div className="left">
            <div className="token_icon_wrap">
              <SharedAssetIcon
                // TODO this should come from a connected component that knows
                // about all of our asset metadata
                logoURL={renderDetails.assetLogoURL}
                symbol={renderDetails.assetSymbol}
                size="small"
              />
            </div>
            <div className="amount">
              <span className="bold_amount_count">
                {renderDetails.assetValue}
              </span>
              <span className="name">{renderDetails.assetSymbol}</span>
            </div>
          </div>
          <div className="right">
            {isSendActivity(activity, asAccount) ? (
              <div className="outcome" title={renderDetails.recipient.address}>
                To:
                {` ${
                  renderDetails.recipient.name ??
                  (renderDetails.recipient.address === undefined
                    ? "(Contract creation)"
                    : truncateAddress(renderDetails.recipient.address))
                }`}
              </div>
            ) : (
              <div className="outcome" title={activity.from}>
                From:
                {` ${activity.fromTruncated}`}
              </div>
            )}
          </div>
        </div>
      </button>
      <style jsx>
        {`
          button {
            height: 72px;
            border-radius: 16px;
            background-color: var(--green-95);
            display: flex;
            flex-direction: column;
            padding: 10px 19px 8px 8px;
            box-sizing: border-box;
            margin-bottom: 16px;
            justify-content: space-between;
            align-items: center;
          }
          button:hover {
            background-color: var(--green-80);
          }
          .activity_icon {
            background: url("./images/activity_contract_interaction@2x.png");
            background-size: cover;
            width: 14px;
            height: 14px;
            margin-right: 4px;
            margin-left: 9px;
          }
          .receive_icon {
            background: url("./images/activity_receive@2x.png");
            background-size: cover;
          }
          .send_icon {
            background: url("./images/activity_send@2x.png");
            background-size: cover;
          }
          .approve_icon {
            background: url("./images/activity_approve@2x.png");
            background-size: cover;
          }
          .swap_icon {
            background: url("./images/activity_swap@2x.png");
            background-size: cover;
          }
          .contract_interaction_icon {
            background: url("./images/activity_contract_interaction@2x.png");
            background-size: cover;
          }
          .status:before {
            content: "•";
            margin: 0 3px;
          }
          .failed {
            color: var(--error);
          }
          .pending {
            color: var(--attention);
          }
          .dropped {
            color: var(--green-20);
          }
          }
          .top {
            height: 16px;
            color: var(--green-40);
            font-size: 12px;
            font-weight: 500;
            line-height: 16px;
            display: flex;
            justify-content: space-between;
            width: 100%;
            align-items: center;
            margin-bottom: 2px;
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
            display: flex;
            flex-wrap: wrap;
            padding: 0px 8px;
            align-items: center;
          }
          .bold_amount_count {
            height: 24px;
            color: #fefefc;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-right: 4px;
            // For Infinite text in token approvals.
            text-transform: none;
          }
          .name {
            white-space: nowrap;
            padding-top: 3px;
          }
          .price {
            width: 58px;
            height: 17px;
            color: var(--green-40);
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
            white-space: nowrap;
          }
          .outcome {
            color: var(--green-5);
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
