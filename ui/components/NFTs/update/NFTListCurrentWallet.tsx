import React, { ReactElement } from "react"
import { selectCurrentAccountNFTs } from "@tallyho/tally-background/redux-slices/selectors"
import NFTList from "./NFTList"
import { useBackgroundSelector } from "../../../hooks"

export default function NFTListCurrentWallet(): ReactElement {
  const collections = useBackgroundSelector(selectCurrentAccountNFTs)

  return <NFTList collections={collections} />
}
