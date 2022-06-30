import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { setShowingActivityDetail } from "@tallyho/tally-background/redux-slices/ui"
import {
  selectCurrentAccount,
  selectShowingActivityDetail,
} from "@tallyho/tally-background/redux-slices/selectors"
import { ActivityItem } from "@tallyho/tally-background/redux-slices/activities"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"

type Props = {
  activities: ActivityItem[]
}

export default function WalletActivityList({
  activities,
}: Props): ReactElement {
  const dispatch = useBackgroundDispatch()
  const showingActivityDetail = useBackgroundSelector(
    selectShowingActivityDetail
  )

  // Used to fix Tx Details Slide-up menu should close
  // when extension closes. (#618)
  const [instantlyHideActivityDetails, setInstantlyHideActivityDetails] =
    useState(true)

  useEffect(() => {
    setInstantlyHideActivityDetails(true)
    dispatch(setShowingActivityDetail(null))
  }, [dispatch])

  const currentAccount = useBackgroundSelector(selectCurrentAccount).address

  const handleOpen = useCallback(
    (activityItem: ActivityItem) => {
      setInstantlyHideActivityDetails(false)
      dispatch(setShowingActivityDetail(activityItem.hash))
    },
    [dispatch]
  )

  const handleClose = useCallback(() => {
    dispatch(setShowingActivityDetail(null))
  }, [dispatch])

  if (!activities || activities.length === 0)
    return (
      <span>
        Tally Ho will populate your historical activity over time; this may take
        an hour or more for accounts that have been active for a long time. For
        new accounts, new activity will show up here.
        <style jsx>{`
          span {
            width: 316px;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: var(--green-40);
            font-size: 16px;
            text-align: center;
            line-height: 22px;
            margin: 0 auto;
            margin-top: 15px;
          }
        `}</style>
      </span>
    )

  return (
    <>
      {!instantlyHideActivityDetails && (
        <SharedSlideUpMenu isOpen={!!showingActivityDetail} close={handleClose}>
          {showingActivityDetail ? (
            <WalletActivityDetails activityItem={showingActivityDetail} />
          ) : (
            <></>
          )}
        </SharedSlideUpMenu>
      )}

      <ul>
        {activities.map((activityItem) => {
          if (activityItem) {
            return (
              <WalletActivityListItem
                onClick={() => {
                  handleOpen(activityItem)
                }}
                key={activityItem?.hash}
                activity={activityItem}
                asAccount={currentAccount}
              />
            )
          }
          return <></>
        })}
      </ul>
    </>
  )
}
