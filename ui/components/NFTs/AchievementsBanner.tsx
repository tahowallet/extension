import React, { ReactElement } from "react"
import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"

export default function AchievementsBanner(): ReactElement {
  return (
    <SharedBanner>
      <div className="container">
        <img src="./images/achievement_optimism@2x.png" alt="achievement NFT" />
        <div>
          <div className="title">New Optimism quest!</div>
          <div className="subtitle">Grow your achievements assets.</div>
          <SharedButton
            style={{ height: "auto" }}
            size="medium"
            type="tertiary"
            iconSmall="new-tab"
            onClick={() => {
              window.open(`https://galxe.com/`, "_blank")?.focus()
            }}
          >
            Collect it
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        img {
          width: 82px;
          height: 82px;
        }
        .container {
          display: flex;
          align-items: center;
        }
        .title {
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          color: var(--green-20);
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
