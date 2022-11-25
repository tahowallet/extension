import React, { ReactElement } from "react"
import { Trans, useTranslation } from "react-i18next"

export default function NFTsPortfolioOverview(): ReactElement {
  const { t } = useTranslation()

  // TODO: Replace these stubs
  const nftCount = 30
  const collectionCount = 12
  const badgeCount = 6

  return (
    <section>
      <header>
        <h5 className="nft-count">NFT(30)</h5>
        <span className="estimate">~$24,231,00</span>
      </header>
      <div>
        <Trans
          t={t}
          i18nKey="overview.nfts"
          values={{
            nfts: nftCount,
            collections: collectionCount,
            badges: badgeCount,
          }}
        >
          {/* 
            These strings will not get rendered, they act as placeholders
            to pass the right component structure to Trans
           */}
          <strong>Several</strong>
          {` NFTs in `}
          <strong>a few</strong>
          {` collections and `}
          <strong>many</strong>
          {` badges`}
        </Trans>
      </div>
      <style jsx>
        {`
          .nft-count {
            margin: 0;
            font-family: "Segment";
            font-weight: 400;
            font-size: 16px;
            line-height: 24px;
            color: var(--white);
          }

          .estimate {
            font-family: "Segment";
            font-style: normal;
            font-weight: 500;
            font-size: 16px;
            line-height: 24px;
            color: var(--green-20);
          }

          header {
            display: flex;
            justify-content: space-between;
          }

          div {
            background: var(--green-95);
            border-radius: 2px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            padding: 8px;
            margin-top: 6px;
          }

          div strong {
            color: var(--white);
          }
        `}
      </style>
    </section>
  )
}
