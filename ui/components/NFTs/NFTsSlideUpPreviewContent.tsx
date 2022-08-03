import React, { ReactElement } from "react"
import { ETHEREUM, POLYGON } from "@tallyho/tally-background/constants"
import { NFTItem } from "@tallyho/tally-background/redux-slices/nfts"
import SharedIcon from "../Shared/SharedIcon"
import NFTsImage from "./NFTsImage"
import { scanWebsite } from "../../utils/constants"

function getPreviewLink({
  chainID,
  contractAddress,
  tokenId,
}: {
  chainID: number
  contractAddress: string
  tokenId: string
}) {
  const parsedTokenID = BigInt(tokenId).toString()
  const previewURL = {
    [POLYGON.chainID]: `/token/${contractAddress}?a=${parsedTokenID}`,
    [ETHEREUM.chainID]: `/nft/${contractAddress}/${parsedTokenID}`,
  }

  return `${scanWebsite[chainID].url}${previewURL[chainID]}`
}

export default function NFTsSlideUpPreviewContent({
  NFT,
}: {
  NFT: NFTItem
}): ReactElement {
  const {
    title,
    media,
    id: { tokenId },
    chainID,
    contract: { address: contractAddress },
  } = NFT
  const src = media[0].gateway ?? ""

  return (
    <>
      <header>
        <h1>{title || "No title"}</h1>
        <SharedIcon
          icon="icons/s/new-tab.svg"
          width={16}
          color="var(--green-40)"
          hoverColor="var(--trophy-gold)"
          onClick={() => {
            window
              .open(
                getPreviewLink({ chainID, contractAddress, tokenId }),
                "_blank"
              )
              ?.focus()
          }}
        />
      </header>
      <div className="preview">
        <NFTsImage alt={title} src={src} fit="contain" />
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
