import React, { ReactElement, useEffect } from "react"
import { fetchThenUpdateNFTsByNetwork } from "@tallyho/tally-background/redux-slices/nfts"
import {
  getAllAddresses,
  getAllNetworks,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectOATsList } from "@tallyho/tally-background/redux-slices/selectors/nftsSelectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

import OATsEmpty from "./OATsEmpty"
import NFTsList from "./NFTsList"

export default function OATsOverview(): ReactElement {
  const OATs = useBackgroundSelector(selectOATsList)
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
    <div className="oat_overview">
      {OATs.length ? <NFTsList nfts={OATs} isOAT /> : <OATsEmpty />}
      <style jsx>
        {`
          .oat_overview {
            margin: 0 16px;
          }
        `}
      </style>
    </div>
  )
}
