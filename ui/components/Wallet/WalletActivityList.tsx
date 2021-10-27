import React, { ReactElement, useCallback } from "react"
import { setShowingActivityDetail } from "@tallyho/tally-background/redux-slices/ui"
import { ActivityItem } from "@tallyho/tally-background/redux-slices/activities"
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

  const { activities, blocks } = useBackgroundSelector((background) => {
    return {
      activities: background.activities[background.ui.selectedAccount?.address],
      blocks: background.account.blocks,
    }
  })

  const handleOpen = useCallback(
    (activityItem) => {
      dispatch(setShowingActivityDetail(activityItem.hash))
    },
    [dispatch]
  )

  const handleClose = useCallback(() => {
    dispatch(setShowingActivityDetail(null))
  }, [dispatch])

  if (!activities) return <></>

  return (
    <>
      <SharedSlideUpMenu
        isOpen={showingActivityDetail !== null}
        close={handleClose}
      >
        {showingActivityDetail ? (
          <WalletActivityDetails
            activityItem={activities[showingActivityDetail]}
          />
        ) : (
          <></>
        )}
      </SharedSlideUpMenu>
      <ul>
        {Object.keys(activities).length === 0 ? (
          <div className="loading">
            <SharedLoadingSpinner />
            <span>This may initially take awhile.</span>
          </div>
        ) : (
          <>
            {Object.entries(activities).map(
              ([hash, activityItem]: [string, ActivityItem]) => (
                <WalletActivityListItem
                  onClick={() => {
                    handleOpen(activityItem)
                  }}
                  key={hash}
                  activity={{
                    ...activityItem,
                    timestamp: blocks[activityItem.blockHeight]?.timestamp,
                  }}
                />
              )
            )}
          </>
        )}
      </ul>
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
    </>
  )
}
