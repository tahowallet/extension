import React, { ReactElement, useEffect, useRef, useState } from "react"
import dayjs from "dayjs"
import {
  sameEVMAddress,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import { useTranslation } from "react-i18next"
import { Activity } from "@tallyho/tally-background/redux-slices/activities"
import { getActivityStatus } from "@tallyho/tally-background/redux-slices/utils/activities-utils"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedActivityIcon from "../Shared/SharedActivityIcon"
import useActivityViewDetails from "../../hooks/activity-hooks"

interface Props {
  onClick: () => void
  activity: Activity
  activityInitiatorAddress: string
}

function isSendActivity(
  activity: Activity,
  activityInitiatorAddress: string
): boolean {
  return activity.type === "asset-transfer"
    ? sameEVMAddress(activity.sender?.address, activityInitiatorAddress)
    : true
}

export default function WalletActivityListItem(props: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.activities",
  })
  const { onClick, activity, activityInitiatorAddress } = props
  const outcomeRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [outcomeWidth, setOutcomeWidth] = useState(0)
  const [bottomWidth, setBottomWidth] = useState(0)

  useEffect(() => {
    if (outcomeRef.current) {
      setOutcomeWidth(outcomeRef.current.offsetWidth)
    }
  }, [outcomeRef])

  useEffect(() => {
    if (bottomRef.current) {
      setBottomWidth(bottomRef.current.offsetWidth)
    }
  }, [bottomRef])

  const activityViewDetails = useActivityViewDetails(
    activity,
    activityInitiatorAddress
  )

  const status = getActivityStatus(activity)

  return (
    <li>
      <button type="button" className="standard_width" onClick={onClick}>
        <div className="top">
          <div className="left">
            <SharedActivityIcon type={activityViewDetails.icon} size={14} />
            {activityViewDetails.label}
            {status !== "completed" ? (
              <div className={`status ${status}`}>{t(`status.${status}`)}</div>
            ) : (
              <></>
            )}
          </div>
          <div className="right">
            {activity.blockTimestamp &&
              dayjs.unix(activity.blockTimestamp).format("MMM D")}
          </div>
        </div>
        <div ref={bottomRef} className="bottom">
          <div className="left">
            <div className="token_icon_wrap">
              <SharedAssetIcon
                // TODO this should come from a connected component that knows
                // about all of our asset metadata
                logoURL={activityViewDetails.assetLogoURL}
                symbol={activityViewDetails.assetSymbol}
                size="small"
              />
            </div>
            <div className="amount">
              <span
                className="bold_amount_count"
                title={activityViewDetails.assetValue}
              >
                {activityViewDetails.assetValue}
              </span>
              <span className="name">{activityViewDetails.assetSymbol}</span>
            </div>
          </div>
          <div ref={outcomeRef} className="right">
            {isSendActivity(activity, activityInitiatorAddress) ? (
              <div
                className="outcome"
                title={activityViewDetails.recipient.address}
              >
                {t("transactionTo")}
                {` ${
                  activityViewDetails.recipient.name ??
                  (activityViewDetails.recipient.address === undefined
                    ? t("contractCreation")
                    : truncateAddress(activityViewDetails.recipient.address))
                }`}
              </div>
            ) : (
              <div className="outcome" title={activity.from}>
                {t("transactionFrom")}
                {` ${truncateAddress(activity.from)}`}
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
            padding: 9px 19px 8px 8px;
            box-sizing: border-box;
            margin-bottom: 16px;
            justify-content: space-between;
            align-items: center;
          }
          button:hover {
            background-color: var(--green-80);
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
            max-width: calc(${bottomWidth}px - 50px - ${outcomeWidth}px);
            overflow: hidden;
            text-overflow: ellipsis;
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
