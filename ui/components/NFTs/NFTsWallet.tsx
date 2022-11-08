import React, { ReactElement, useEffect, useMemo } from "react"
import { fetchThenUpdateNFTsByNetwork } from "@tallyho/tally-background/redux-slices/nfts"
import {
  selectCurrentAccount,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectNFTs } from "@tallyho/tally-background/redux-slices/selectors/nftsSelectors"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NFTsList from "./NFTsList"
import NFTsEmpty from "./NFTsEmpty"
import SharedBanner from "../Shared/SharedBanner"

export default function NFTsWallet(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "wallet" })

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
    <section>
      <SharedBanner
        icon="notif-announcement"
        iconColor="var(--link)"
        canBeClosed
        id="nft_soon"
        customStyles="margin: 8px 0;"
      >
        {t("NFTPricingComingSoon")}
      </SharedBanner>
      {currentOwnedNFTsList?.length ? (
        <NFTsList nfts={currentOwnedNFTsList} />
      ) : (
        <NFTsEmpty />
      )}
    </section>
  )
}
