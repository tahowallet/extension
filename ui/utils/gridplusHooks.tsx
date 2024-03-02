import React from "react"
import { useBackgroundDispatch } from "../hooks"
import { connectGridplus } from "@tallyho/tally-background/redux-slices/gridplus"

export const useGridPlusInit = () => {
  const dispatch = useBackgroundDispatch()
  React.useEffect(() => {
    dispatch(connectGridplus({}))
  }, [])
}
