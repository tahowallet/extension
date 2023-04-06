import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"

export default function AchievementsBanner(): ReactElement {
  const { t } = useTranslation()
  return (
    <SharedBanner>
      <div className="container">
        <img src="./images/achievement_tally_ho@2x.png" alt="achievement NFT" />
        <div>
          <div className="subtitle">{t("achievements.startWith")}</div>
          <SharedButton
            style={{ height: "auto" }}
            size="medium"
            type="tertiary"
            iconSmall="new-tab"
            onClick={() => {
              window.open(`https://galxe.com/taho`, "_blank")?.focus()
            }}
          >
            {t("achievements.collection")}
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        img {
          width: 64px;
          height: 64px;
          margin: 0 15px 0 10px;
        }
        .container {
          display: flex;
          align-items: center;
        }
        .subtitle {
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }
      `}</style>
    </SharedBanner>
  )
}
