import React from "react"
import {
  connectGridPlus,
  initializeActiveAddresses,
} from "@tallyho/tally-background/redux-slices/grid-plus"
import { useBackgroundDispatch } from "../hooks"

export const useGridPlusInit = () => {
  const dispatch = useBackgroundDispatch()
  React.useEffect(() => {
    dispatch(connectGridPlus({}))
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
