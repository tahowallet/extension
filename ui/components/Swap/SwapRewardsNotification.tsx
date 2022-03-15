import {
  selectHideSwapRewardsNotification,
  toggleHideSwapRewardsNotification,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useDispatch, useSelector } from "react-redux"

export default function SwapRewardsNotification(): ReactElement {
  const dispatch = useDispatch()
  const hideSwapRewardsNotification = useSelector(
    selectHideSwapRewardsNotification
  )

  const hideNotification = () =>
    dispatch(toggleHideSwapRewardsNotification(true))

  if (hideSwapRewardsNotification) return <></>

  return (
    <div className="notification_container">
      <div className="announce_icon" />
      <span>Swap rewards coming soon</span>

      <button
        type="button"
        className="close_button"
        aria-label="Close"
        onClick={hideNotification}
      >
        <div className="icon_close" />
      </button>
      <style jsx>{`
        .notification_container {
          background: var(--green-120);
          color: var(--link);
          padding: 8px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        .close_button {
          margin-left: auto;
        }
        .icon_close {
          mask-image: url("./images/close.svg");
          mask-size: cover;
          background-color: var(--green-40);
          width: 11px;
          height: 11px;
          cursor: pointer;
          margin-left: auto;
          margin-right: 4px;
        }
        .announce_icon {
          mask-image: url("./images/notification_announce.svg");
          mask-size: cover;
          background-color: var(--link);
          width: 24px;
          height: 24px;
          margin-right: 10px;
        }
      `}</style>
    </div>
  )
}
