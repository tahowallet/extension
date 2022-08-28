import React, { ReactElement } from "react"
import { ETHEREUM, POLYGON } from "@tallyho/tally-background/constants"
import { NFT } from "@tallyho/tally-background/redux-slices/nfts"
import SharedIcon from "../Shared/SharedIcon"
import NFTsImage from "./NFTsImage"
import { scanWebsite } from "../../utils/constants"

function getPreviewLink({
  chainID,
  contractAddress,
  tokenID,
}: {
  chainID: number
  contractAddress: string
  tokenID: string
}) {
  const parsedTokenID = BigInt(tokenID).toString()
  const previewURL = {
    [POLYGON.chainID]: `/token/${contractAddress}?a=${parsedTokenID}`,
    [ETHEREUM.chainID]: `/nft/${contractAddress}/${parsedTokenID}`,
  }

  return `${scanWebsite[chainID].url}${previewURL[chainID]}`
}

export default function NFTsSlideUpPreviewContent({
  nft,
}: {
  nft: NFT
}): ReactElement {
  const {
    name,
    media,
    tokenID,
    network: { chainID },
    contract: { address: contractAddress },
  } = nft
  const src = media[0]?.url ?? ""

  return (
    <>
      <header>
        <h1>{name || "No title"}</h1>
        <SharedIcon
          icon="icons/s/new-tab.svg"
          width={16}
          color="var(--green-40)"
          hoverColor="var(--trophy-gold)"
          onClick={() => {
            window
              .open(
                getPreviewLink({
                  chainID: Number(chainID),
                  contractAddress,
                  tokenID,
                }),
                "_blank"
              )
              ?.focus()
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
