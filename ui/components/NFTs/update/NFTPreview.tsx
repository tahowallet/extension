import { NFT } from "@tallyho/tally-background/nfts"
import React, { ReactElement } from "react"

export default function NFTPreview(props: { nft: NFT }): ReactElement {
  const { nft } = props
  return <>{nft.name}</>
}
