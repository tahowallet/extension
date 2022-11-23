import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import NFTsOverview from "../components/NFTs/NFTsOverview"
import SharedBanner from "../components/Shared/SharedBanner"

export default function NFTs(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })
  return (
    <>
      <SharedBanner
        icon="notif-announcement"
        iconColor="var(--link)"
        canBeClosed
        id="nft_soon"
        customStyles="margin: 8px 0;"
      >
        {t("NFTPricingComingSoon")}
      </SharedBanner>
      <NFTsOverview />
    </>
  )
}
