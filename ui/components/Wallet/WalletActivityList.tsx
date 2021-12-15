import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { setShowingActivityDetail } from "@tallyho/tally-background/redux-slices/ui"
import { ActivityItem } from "@tallyho/tally-background/redux-slices/activities"
import { selectShowingActivityDetail } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
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
      <div className="loading">
        <SharedLoadingSpinner />
        <span>This may initially take awhile.</span>
        <style jsx>{`
          .loading {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 20px;
          }
          .loading span {
            color: var(--green-60);
            margin-top: 12px;
            font-size: 14px;
          }
        `}</style>
      </div>
    )

  return (
    <>
      {!instantlyHideActivityDetails && (
        <SharedSlideUpMenu
          isOpen={showingActivityDetail !== null}
          close={handleClose}
        >
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
              />
            )
          }
          return <></>
        })}
      </ul>
    </>
  )
}
