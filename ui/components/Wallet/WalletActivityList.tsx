// @ts-check

import React, { ReactElement, useCallback } from "react"

import { AnyEVMTransaction } from "@tallyho/tally-background/types"
import { setShowingActivityDetail } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"

// Leaving the old activity type as an option for now to use the
// existing single asset page placeholder data.
interface Props {
  activity:
    | AnyEVMTransaction[]
    | { timeStamp?: string; value?: string; from?: string }[]
}

export default function WalletActivityList(props: Props): ReactElement {
  const { activity } = props
  const dispatch = useBackgroundDispatch()
  const { showingActivityDetail } = useBackgroundSelector(
    (background) => background.ui
  )

  const handleOpen = useCallback((activityId) => {
    dispatch(setShowingActivityDetail(activityId))
  }, [])

  const handleClose = useCallback(() => {
    dispatch(setShowingActivityDetail(undefined))
  }, [])

  return (
    <>
      <SharedSlideUpMenu
        isOpen={showingActivityDetail && true}
        close={handleClose}
      >
        <WalletActivityDetails />
      </SharedSlideUpMenu>
      <ul>
        {activity.map((activityItem) => (
          <WalletActivityListItem
            onClick={() => {
              handleOpen(activityItem.hash)
            }}
            activity={activityItem}
          />
        ))}
      </ul>
    </>
  )
}
