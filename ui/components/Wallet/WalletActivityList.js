import React from "react"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"
import { setShowingActivityDetail, uiSelector } from "../../slices/ui"

export default function WalletActivityList(props) {
  const { activity } = props
  const dispatch = useDispatch()
  const { showingActivityDetail } = useSelector(uiSelector)

  function handleOpen(activityId) {
    dispatch(setShowingActivityDetail(activityId))
  }

  function handleClose() {
    dispatch(setShowingActivityDetail(undefined))
  }

  return (
    <>
      <SharedSlideUpMenu isOpen={showingActivityDetail} close={handleClose}>
        <WalletActivityDetails />
      </SharedSlideUpMenu>
      <ul>
        {activity.map((activityItem) => (
          <WalletActivityListItem
            onClick={() => {
              handleOpen(activityItem.blockHash)
            }}
            activity={activityItem}
          />
        ))}
      </ul>
    </>
  )
}

WalletActivityList.propTypes = {
  activity: PropTypes.array.isRequired,
}
