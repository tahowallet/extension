import React, { ReactElement } from "react"
import { selectNFTCollections } from "@tallyho/tally-background/redux-slices/selectors"
import NFTList from "./NFTList"
import { useBackgroundSelector } from "../../../hooks"

export default function NFTListPortfolio(): ReactElement {
  const collections = useBackgroundSelector(selectNFTCollections)

  return <NFTList collections={collections} />
}
