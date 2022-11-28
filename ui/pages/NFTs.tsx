import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import {
  selectMainCurrencySign,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import { formatCurrencyAmount } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import AchievementsOverview from "../components/NFTs/AchievementsOverview"
import NFTsOverview from "../components/NFTs/NFTsOverview"
import SharedBanner from "../components/Shared/SharedBanner"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsExploreBanner from "../components/NFTS_update/NFTsExploreBanner"
import NFTsHeader from "../components/NFTS_update/NFTsHeader"
import { useBackgroundSelector } from "../hooks"

const PANEL_NAMES = ["NFTs", "Badges"]

// TODO: Remove these stubs
const stubSelectNFTCount = () => 16
const stubSelectCollectionCount = () => 2
const stubSelectBadgeCount = () => 5

export default function NFTs(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })
  const nftCounts = useBackgroundSelector(stubSelectNFTCount)
  const collectionCount = useBackgroundSelector(stubSelectCollectionCount)
  const badgeCount = useBackgroundSelector(stubSelectBadgeCount)

  const mainCurrencySign = useBackgroundSelector(selectMainCurrencySign)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const NFTsLoading = useBackgroundSelector(() => false)

  // TODO: Remove these stubs
  const someAmount = formatCurrencyAmount(mainCurrencySymbol, 240_241, 0)
  const someAmountInETH = "21.366 ETH"
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <div className="page_content">
      <NFTsHeader
        nfts={nftCounts}
        collections={collectionCount}
        badges={badgeCount}
        totalInCurrency={someAmount}
        totalInETH={someAmountInETH}
        mainCurrencySign={mainCurrencySign}
        loading={NFTsLoading}
      />
      <div
        className={classNames("panel_switcher_wrap", {
          margin: !(nftCounts > 0),
        })}
      >
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={PANEL_NAMES}
        />
      </div>
      {panelNumber === 0 &&
        (nftCounts > 0 ? (
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
        ) : (
          <NFTsExploreBanner type="nfts" />
        ))}
      {panelNumber === 1 &&
        (nftCounts > 0 ? (
          <AchievementsOverview />
        ) : (
          <NFTsExploreBanner type="badge" />
        ))}
      <style jsx>
        {`
          .page_content {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
          }
          .panel_switcher_wrap {
            width: 100%;
          }
          .panel_switcher_wrap.margin {
            margin-bottom: 16px;
          }
        `}
      </style>
    </div>
  )
}
