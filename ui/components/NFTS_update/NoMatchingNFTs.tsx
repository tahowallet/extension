import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import NFTsExploreBanner from "./NFTsExploreBanner"

export default function NoMatchingNFTs(props: {
  type: "badge" | "nfts"
}): ReactElement {
  const { type } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts",
  })

  return (
    <div className="content">
      <h2>
        {t("noMatchingNFTs", {
          type: type === "nfts" ? t("type1") : t("type2"),
        })}
      </h2>
      <NFTsExploreBanner type={type} />
      <style jsx>{`
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          margin-top: 38px;
        }
        .content h2 {
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
