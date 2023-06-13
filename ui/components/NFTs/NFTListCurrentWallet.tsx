import React, { ReactElement } from "react"
import {
  selectCurrentAccountNFTs,
  selectCurrentAccountNFTsCount,
  selectIsReloadingNFTs,
} from "@tallyho/tally-background/redux-slices/selectors"
import NFTList from "./NFTList"
import { useBackgroundSelector, useNFTsReload } from "../../hooks"
import NFTsExploreBanner from "./NFTsExploreBanner"

export default function NFTListCurrentWallet(): ReactElement {
  const collections = useBackgroundSelector(selectCurrentAccountNFTs)
  const nftCount = useBackgroundSelector(selectCurrentAccountNFTsCount)
  const isLoading = useBackgroundSelector(selectIsReloadingNFTs)

  useNFTsReload()

  if (!nftCount && !isLoading) return <NFTsExploreBanner type="nfts" />

  return <NFTList collections={collections} />
}
