import React, { ReactElement, useEffect, useMemo } from "react"
import { fetchThenUpdateNFTsByNetwork } from "@tallyho/tally-background/redux-slices/nfts"
import {
  getAllAddresses,
  getAllNetworks,
} from "@tallyho/tally-background/redux-slices/selectors"
import selectNFTs from "@tallyho/tally-background/redux-slices/selectors/nftsSelectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NFTsList from "./NFTsList"
import NFTsEmpty from "./NFTsEmpty"

export default function NFTsOverview(): ReactElement {
  const NFTs = useBackgroundSelector(selectNFTs)
  const allNetworks = useBackgroundSelector(getAllNetworks)
  const allAddresses = useBackgroundSelector(getAllAddresses)
  const dispatch = useBackgroundDispatch()

  const NFTItems = useMemo(() => {
    return Object.values(NFTs.evm).flatMap((NFTsByChain) =>
      Object.values(NFTsByChain).flatMap((item) => item)
    )
  }, [NFTs])

  useEffect(() => {
    dispatch(
      fetchThenUpdateNFTsByNetwork({
        addresses: allAddresses,
        networks: allNetworks,
      })
    )

    // every 30s or so we are updating balances which is causing rerendering loop
    // here with 'allAddresses' and 'allNetworks' in the deps table
  }, [dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="nft_overview">
      {NFTItems.length ? (
        <NFTsList nfts={NFTItems} height={343} />
      ) : (
        <NFTsEmpty />
      )}
      <style jsx>
        {`
          .nft_overview {
            margin: 0 16px;
          }
        `}
      </style>
    </div>
  )
}
