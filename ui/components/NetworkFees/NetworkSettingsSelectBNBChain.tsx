import { useTranslation } from "react-i18next"
import React, { ReactElement } from "react"

export default function NetworkSettingsSelectBNBChain(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "networkFees.bsc",
  })
  return (
    <div className="content">
      <span className="title">{t("title")}</span>
      <span className="description">{t("description")}</span>
      <style jsx>
        {`
          .content {
            color: var(--white);
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .title {
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
          }
          .description {
            font-weight: 500;
            font-size: 16px;
            line-height: 24px;
          }
        `}
      </style>
    </div>
  )
}
