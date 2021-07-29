import React from "react"
import { useDispatch, useSelector } from "react-redux"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"
import { setShowingActivityDetail, uiSelector } from "../../slices/ui"

export default function WalletActivityList() {
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
        {[1234123, 1532, 2362, 237345, 243623].map((activityId) => (
          <WalletActivityListItem
            onClick={() => {
              handleOpen(activityId)
            }}
          />
        ))}
      </ul>
    </>
  )
}
