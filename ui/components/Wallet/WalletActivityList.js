// @ts-check

import React from "react"
import PropTypes from "prop-types"
import { setShowingActivityDetail } from "@tallyho/tally-api/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"

export default function WalletActivityList(props) {
  const { activity } = props
  const dispatch = useBackgroundDispatch()
  const { showingActivityDetail } = useBackgroundSelector(
    (background) => background.ui
  )

  function handleOpen(activityId) {
    dispatch(setShowingActivityDetail(activityId))
  }

  function handleClose() {
    dispatch(setShowingActivityDetail(undefined))
  }

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

WalletActivityList.propTypes = {
  activity: PropTypes.arrayOf(
    PropTypes.shape({
      hash: PropTypes.string,
      timeStamp: PropTypes.string,
      from: PropTypes.string,
    })
  ).isRequired,
}
