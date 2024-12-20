import React from "react"
import {
  connectGridplus,
  initializeActiveAddresses,
} from "@tallyho/tally-background/redux-slices/gridplus"
import { useBackgroundDispatch } from "../hooks"

export const useGridPlusInit = () => {
  const dispatch = useBackgroundDispatch()
  React.useEffect(() => {
    dispatch(connectGridplus({}))
    dispatch(initializeActiveAddresses())
  }, [dispatch])
}

export type GridPlusContextProps = {
  onSignedIn: (permitted: boolean) => void
  onPaired: () => void
  onImported: () => void
}

export const GridPlusContext = React.createContext<
  GridPlusContextProps | undefined
>(undefined)
export const useGridPlus = () =>
  React.useContext<GridPlusContextProps>(GridPlusContext as never)
