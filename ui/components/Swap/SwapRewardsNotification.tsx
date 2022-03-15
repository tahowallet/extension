import {
  selectHideSwapRewardsNotification,
  toggleHideSwapRewardsNotification,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useDispatch, useSelector } from "react-redux"
import SharedIcon from "../Shared/SharedIcon"

export default function SwapRewardsNotification(): ReactElement {
  const dispatch = useDispatch()
  const hideSwapRewardsNotification = useSelector(
    selectHideSwapRewardsNotification
  )

  if (hideSwapRewardsNotification) return <></>

  return (
    <div className="notification_container">
      <SharedIcon
        icon="notification_announce"
        width={24}
        color="var(--link)"
        customStyles="margin-right: 10px;"
      />
      <span>Swap rewards coming soon</span>
      <SharedIcon
        icon="close"
        width={11}
        color="var(--green-40)"
        onClick={() => dispatch(toggleHideSwapRewardsNotification(true))}
        customStyles={`
            margin-left: auto;
            margin-right: 4px;
        `}
      />
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
      `}</style>
    </div>
  )
}
