import React, { ReactElement, useEffect, useMemo } from "react"
import { fetchThenUpdateNFTsByNetwork } from "@tallyho/tally-background/redux-slices/nfts"
import {
  selectCurrentAccount,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import selectNFTs from "@tallyho/tally-background/redux-slices/selectors/nftsSelectors"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NFTsList from "./NFTsList"
import NFTsEmpty from "./NFTsEmpty"

export default function NFTsWallet(): ReactElement {
  const NFTs = useBackgroundSelector(selectNFTs)
  const { address } = useBackgroundSelector(selectCurrentAccount) ?? {}
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    dispatch(
      fetchThenUpdateNFTsByNetwork({
        addresses: [address],
        networks: [currentNetwork],
      })
    )
  }, [address, currentNetwork, dispatch])

  const currentOwnedNFTsList = useMemo(() => {
    return (
      NFTs &&
      NFTs.evm[currentNetwork.chainID] &&
      NFTs.evm[currentNetwork.chainID][normalizeEVMAddress(address)]
    )
  }, [NFTs, currentNetwork.chainID, address])

  return (
    <>
      {currentOwnedNFTsList?.length ? (
        <NFTsList nfts={currentOwnedNFTsList} height={296} />
      ) : (
        <NFTsEmpty />
      )}
    </>
  )
}
