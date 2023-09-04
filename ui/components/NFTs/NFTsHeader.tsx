import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  selectAllNFTsCount,
  selectIsReloadingNFTs,
  selectMainCurrencySign,
  selectFilteredNFTBadgesCount,
  selectFilteredNFTCollectionsCount,
  selectFilteredNFTsCount,
} from "@tallyho/tally-background/redux-slices/selectors"

import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import { HeaderContainer, EmptyHeader } from "./NFTsHeaderBase"
import { useBackgroundSelector, useTotalNFTsFloorPrice } from "../../hooks"
import SharedIcon from "../Shared/SharedIcon"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NFTsFilters from "./Filters/NFTsFilters"

export default function NFTsHeader(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })
  const [openFiltersMenu, setOpenFiltersMenu] = useState(false)

  const isLoading = useBackgroundSelector(selectIsReloadingNFTs)
  const allNftCount = useBackgroundSelector(selectAllNFTsCount)
  const nftCount = useBackgroundSelector(selectFilteredNFTsCount)

  const collectionCount = useBackgroundSelector(
    selectFilteredNFTCollectionsCount,
  )
  const badgeCount = useBackgroundSelector(selectFilteredNFTBadgesCount)
  const mainCurrencySign = useBackgroundSelector(selectMainCurrencySign)

  const { totalFloorPriceInETH, totalFloorPriceInUSD } =
    useTotalNFTsFloorPrice()

  const handleToggleClick = useCallback(() => {
    setOpenFiltersMenu((currentlyOpen) => !currentlyOpen)
  }, [])

  if (!allNftCount && !isLoading) {
    return (
      <HeaderContainer>
        <EmptyHeader />
      </HeaderContainer>
    )
  }

  return (
    <>
      <SharedSlideUpMenu
        testid="nft_filters_menu"
        isOpen={openFiltersMenu}
        close={handleToggleClick}
      >
        <NFTsFilters />
      </SharedSlideUpMenu>
      <HeaderContainer>
        <div className="stats_container">
          <div className="stats_title">{t("header.title")}</div>
          {allNftCount > 0 && (
            <div className="filters_container">
              <SharedIcon
                width={24}
                icon="toggle.svg"
                ariaLabel={t("filters.title")}
                color="var(--green-40)"
                hoverColor="var(--green-20)"
                onClick={handleToggleClick}
                disabled={isLoading}
              />
            </div>
          )}
          <div className="stats_totals">
            <span className="currency_sign">{mainCurrencySign}</span>
            <span
              className="currency_total"
              data-testid="nft_header_currency_total"
            >
              {totalFloorPriceInUSD ?? "0"}
            </span>
            {isLoading && (
              <SharedLoadingSpinner size="small" variant="transparent" />
            )}
          </div>
          <div className="crypto_total">{totalFloorPriceInETH ?? "-"} ETH</div>
        </div>
        <ul className="nft_counts">
          <li>
            <strong data-testid="nft_header_nft_count">{nftCount}</strong>
            {t("units.nft", { count: nftCount ?? 0 })}
          </li>
          <li className="spacer" role="presentation" />
          <li>
            <strong data-testid="nft_header_collection_count">
              {collectionCount}
            </strong>
            {t("units.collection", { count: collectionCount ?? 0 })}
          </li>
          <li className="spacer" role="presentation" />
          <li>
            <strong data-testid="nft_header_badge_count">{badgeCount}</strong>
            {t("units.badge", { count: badgeCount ?? 0 })}
          </li>
        </ul>
      </HeaderContainer>
      <style jsx>{`
        .stats_container {
          text-align: center;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .stats_title {
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--green-20);
        }

        .filters_container {
          position: absolute;
          width: 90vw;
          display: flex;
          justify-content: end;
        }

        .stats_spinner {
          position: absolute;
          right: -25px;
        }

        .stats_totals {
          position: relative;
          display: flex;
          flex-direction: row;
          gap: 4px;
          align-items: center;
        }

        .currency_total {
          font-size: 36px;
          font-weight: 500;
          line-height: 48px;
          letter-spacing: 0em;
          color: #fff;
        }

        .currency_sign {
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          letter-spacing: 0em;
          color: var(--green-40);
          align-self: start;
          margin-top: 7px;
        }

        .crypto_total {
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--green-20);
        }

        .nft_counts {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-evenly;
          width: 100%;
        }

        li {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          color: var(--green-40);
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
        }

        li strong {
          color: var(--white);
        }

        li.spacer {
          border: 0.5px solid var(--green-80);
          align-self: stretch;
        }
      `}</style>
    </>
  )
}
