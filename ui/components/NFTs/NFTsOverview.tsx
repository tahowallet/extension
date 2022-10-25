import React, { ReactElement, useEffect } from "react"
import { fetchThenUpdateNFTsByNetwork } from "@tallyho/tally-background/redux-slices/nfts"
import {
  getAllAddresses,
  getAllNetworks,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectNFTsList } from "@tallyho/tally-background/redux-slices/selectors/nftsSelectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NFTsList from "./NFTsList"
import NFTsEmpty from "./NFTsEmpty"

export default function NFTsOverview(): ReactElement {
  const NFTs = useBackgroundSelector(selectNFTsList)
  const allNetworks = useBackgroundSelector(getAllNetworks)
  const allAddresses = useBackgroundSelector(getAllAddresses)
  const dispatch = useBackgroundDispatch()

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
      {NFTs.length ? <NFTsList nfts={NFTs} /> : <NFTsEmpty />}
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
