import React, { ReactElement, useCallback } from "react"
import { setShowingActivityDetail } from "@tallyho/tally-background/redux-slices/ui"
import { selectSelectedAccountActivitiesWithTimestamps } from "@tallyho/tally-background/redux-slices/selectors/activitiesSelectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"

export default function WalletActivityList(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const { showingActivityDetail } = useBackgroundSelector(
    (background) => background.ui
  )

  const { activities } = useBackgroundSelector(
    selectSelectedAccountActivitiesWithTimestamps
  )

  const handleOpen = useCallback(
    (activityItem) => {
      dispatch(setShowingActivityDetail(activityItem))
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
