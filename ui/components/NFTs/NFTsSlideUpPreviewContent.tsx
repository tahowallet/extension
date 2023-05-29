import React, { ReactElement } from "react"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { NFT } from "@tallyho/tally-background/redux-slices/nfts"
import { useTranslation } from "react-i18next"
import SharedIcon from "../Shared/SharedIcon"
import NFTsImage from "./NFTsImage"
import { blockExplorer } from "../../utils/constants"

function getPreviewLink(nft: NFT) {
  const {
    contract: { address: contractAddress },
    tokenID,
    achievementUrl,
  } = nft

  if (achievementUrl) return achievementUrl

  const chainID = Number(nft.network.chainID)
  const parsedTokenID = BigInt(tokenID).toString()
  const previewURL = {
    [POLYGON.chainID]: `/token/${contractAddress}?a=${parsedTokenID}`,
    [ETHEREUM.chainID]: `/nft/${contractAddress}/${parsedTokenID}`,
    [OPTIMISM.chainID]: `/token/${contractAddress}?a=${parsedTokenID}`,
    [ARBITRUM_ONE.chainID]: `/token/${contractAddress}?a=${parsedTokenID}`,
    [BINANCE_SMART_CHAIN.chainID]: `/token/${contractAddress}?a=${parsedTokenID}`,
    [AVALANCHE.chainID]: `/token/${contractAddress}?a=${parsedTokenID}`,
  }

  return `${blockExplorer[chainID].url}${previewURL[chainID]}`
}

export default function NFTsSlideUpPreviewContent({
  nft,
}: {
  nft: NFT
}): ReactElement {
  const { t } = useTranslation()
  const { name, media } = nft
  const src = media[0]?.url ?? ""

  return (
    <>
      <header>
        <h1>{name || t("nfts.noTitle")}</h1>
        <SharedIcon
          icon="icons/s/new-tab.svg"
          width={16}
          color="var(--green-40)"
          hoverColor="var(--trophy-gold)"
          onClick={() => {
            window.open(getPreviewLink(nft), "_blank")?.focus()
          }}
        />
      </header>
      <div className="preview">
        <NFTsImage alt={name} src={src} fit="contain" />
      </div>
      <style jsx>{`
        header {
          margin: 0 24px;
          display: flex;
          align-items: center;
        }
        h1 {
          font-size: 18px;
          line-height: 24px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0px;
          margin-right: 8px;
          max-width: calc(100% - 48px);
        }
        .preview {
          display: flex;
          align-items: center;
          justify-items: center;
          margin: 16px 24px;
          height: calc(100% - 48px - 16px);
          width: calc(100% - 48px);
        }
      `}</style>
    </>
  )
}
