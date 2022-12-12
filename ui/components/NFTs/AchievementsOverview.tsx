import React, { ReactElement, useEffect } from "react"
import { fetchThenUpdateNFTsByNetwork } from "@tallyho/tally-background/redux-slices/nfts"
import {
  getAllAddresses,
  getAllNetworks,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectAchievementsList } from "@tallyho/tally-background/redux-slices/selectors/nftsSelectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

import AchievementsEmpty from "./AchievementsEmpty"
import NFTsList from "./NFTsList"

export default function AchievementsOverview(): ReactElement {
  const achievements = useBackgroundSelector(selectAchievementsList)
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
    <div className="achievement_overview">
      {achievements.length ? (
        <NFTsList nfts={achievements} isAchievement />
      ) : (
        <AchievementsEmpty />
      )}
      <style jsx>
        {`
          .achievement_overview {
            margin: 0 16px;
            width: calc(100% - 32px);
          }
        `}
      </style>
    </div>
  )
}
