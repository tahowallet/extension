import React, { ReactElement, useEffect } from "react"
import { fetchThenUpdateNFTsByNetwork } from "@tallyho/tally-background/redux-slices/nfts"
import {
  selectCurrentAccount,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import selectNFTs from "@tallyho/tally-background/redux-slices/selectors/nftsSelectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NFTsList from "./NFTsList"
import NFTsEmpty from "./NFTsEmpty"

export default function NFTsWallet(): ReactElement {
  const NFTs = useBackgroundSelector(selectNFTs)
  const { address } = useBackgroundSelector(selectCurrentAccount) ?? {}
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    dispatch(fetchThenUpdateNFTsByNetwork({ address, currentNetwork }))
  }, [address, currentNetwork, dispatch])

  const currentOwnedNFTsList =
    NFTs &&
    NFTs.evm[currentNetwork.chainID] &&
    NFTs.evm[currentNetwork.chainID][address]

  return (
    <>
      {currentOwnedNFTsList?.length ? (
        <NFTsList NFTs={currentOwnedNFTsList} />
      ) : (
        <NFTsEmpty />
      )}
    </>
  )
}
