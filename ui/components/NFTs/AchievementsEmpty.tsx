import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import AchievementsBanner from "./AchievementsBanner"

export default function AchievementsEmpty(): ReactElement {
  const { t } = useTranslation()
  return (
    <div className="standard_width container">
      <img className="bowl_image" src="./images/empty_bowl@2x.png" alt="" />
      <p>{t("achievements.empty")}</p>
      <AchievementsBanner />
      <style jsx>
        {`
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 16px;
            height: 100%;
          }
          .bowl_image {
            width: 90px;
            margin-bottom: 10px;
          }
          p {
            width: 280px;
            text-align: center;
            line-height: 24px;
            font-weight: 500;
            color: var(--green-40);
            font-size: 16px;
            margin-bottom: 32px;
            white-space: pre-line;
          }
        `}
      </style>
    </div>
  )
}
