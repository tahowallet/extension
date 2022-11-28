import React, { ReactElement } from "react"
import { selectNFTBadgesCollections } from "@tallyho/tally-background/redux-slices/selectors"
import NFTList from "./NFTList"
import { useBackgroundSelector } from "../../hooks"

export default function NFTListPortfolioBadges(): ReactElement {
  const collections = useBackgroundSelector(selectNFTBadgesCollections)

  return <NFTList collections={collections} />
}
