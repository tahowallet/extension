import React, { ReactElement } from "react"
import { NFT } from "@tallyho/tally-background/redux-slices/nfts"
import { useTranslation } from "react-i18next"
import NFTsImage from "./NFTsImage"

function NFTsListItem({
  nft,
  openPreview,
  isAchievement,
}: {
  nft?: NFT
  isAchievement?: boolean
  openPreview: (nft: NFT) => void
}): ReactElement {
  const { t } = useTranslation()
  // getting undefined sometimes, react-window renders second column even if there is no item?
  if (!nft) return <></>

  const { name, media } = nft
  const src = media[0]?.url ?? ""

  return (
    <>
      <button className="nft" type="button" onClick={() => openPreview(nft)}>
        <NFTsImage
          width={168}
          height={168}
          alt={name}
          src={src}
          isAchievement={isAchievement}
        />
        <span className="title ellipsis">
          <span>{name || t("nfts.noTitle")}</span>
        </span>
      </button>
      <style jsx>{`
        .nft {
          display: flex;
          flex-direction: column;
          position: relative;
          cursor: pointer;
          padding-top: 16px;
        }
        .nft:hover:after {
          content: "";
          width: 168px;
          height: 168px;
          border-radius: ${isAchievement ? "100%" : "8px"};
          position: absolute;
          background: #fff;
          opacity: 0.2;
        }
        .title {
          max-width: 168px;
          margin-top: 8px;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          ${isAchievement && "text-align: center;"}
        }
      `}</style>
    </>
  )
}

export default React.memo(NFTsListItem)
