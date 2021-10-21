import React, { ReactElement, useCallback } from "react"

import { setShowingActivityDetail } from "@tallyho/tally-background/redux-slices/ui"
import { AnyEVMTransaction } from "@tallyho/tally-background/types"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"

interface Props {
  activity: AnyEVMTransaction[]
}

export default function WalletActivityList(props: Props): ReactElement {
  const { activity } = props
  const dispatch = useBackgroundDispatch()
  const { showingActivityDetail } = useBackgroundSelector(
    (background) => background.ui
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
        {activity.length === 0 ? (
          <div className="loading">
            <SharedLoadingSpinner />
            <span>This may initially take awhile.</span>
          </div>
        ) : (
          <>
            {activity.map((activityItem) => (
              <WalletActivityListItem
                onClick={() => {
                  handleOpen(activityItem)
                }}
                activity={activityItem}
              />
            ))}
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
