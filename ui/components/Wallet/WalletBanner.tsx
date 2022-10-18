import { selectHideBanners } from "@tallyho/tally-background/redux-slices/ui"
import { fetchWithTimeout } from "@tallyho/tally-background/utils/fetching"
import classNames from "classnames"
import React, { ReactElement, useEffect, useState } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

// import { useTranslation } from "react-i18next"
import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"
import WalletBannerSlideup from "./WalletBannerSlideup"

enum AchievementStatus {
  Draft = "Draft",
  Active = "Active",
  NotStarted = "NotStarted",
  Expired = "Expired",
  CapReached = "CapReached",
  Deleted = "Deleted",
}

type Achievement = {
  id: string
  name: string
  status: AchievementStatus
  description: string
  thumbnail: string
  startTime: number
  endTime: number
}

async function getActiveAchievement(): Promise<Achievement | null> {
  try {
    const {
      data: {
        space: {
          campaigns: { list: achievements = [] },
        },
      },
    } = (await (
      await fetchWithTimeout("https://graphigo.prd.galaxy.eco/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variables: {},
          operationName: "ArbitrumCampaigns",
          query: `
          query ArbitrumCampaigns {
            space(alias: "arbitrum") {
              campaigns(input: {
                chains: [ARBITRUM]
              }) {
                list {
                  id
                  name
                  status
                  description
                  thumbnail
                  startTime
                  endTime
                }
              }
            }
          }
        `,
        }),
      })
    ).json()) as { data: { space: { campaigns: { list: Achievement[] } } } }

    const activeAchievements = achievements
      .filter((item) => item.status === AchievementStatus.Active)
      .sort((item1, item2) => item1.startTime - item2.startTime)

    return activeAchievements[0] ?? null
  } catch (error) {
    return null
  }
}

export default function WalletBanner(): ReactElement {
  //   const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const hideBanners = useBackgroundSelector(selectHideBanners)
  const [showDismissSlideup, setShowDismissSlideup] = useState(false)
  const [achievement, setAchievement] = useState<Achievement | null>(null)

  useEffect(() => {
    const fetchAchievement = async () => {
      const active = await getActiveAchievement()
      setAchievement(active)
    }

    fetchAchievement()
  }, [dispatch])

  const thumbnail = achievement?.thumbnail // TODO: add fallback thumbnail

  return (
    <div
      className={classNames("wallet_banner_container", {
        hide: hideBanners,
      })}
    >
      <SharedBanner>
        <div className="wallet_banner">
          <SharedIcon
            onClick={() => setShowDismissSlideup(true)}
            icon="icons/s/close.svg"
            ariaLabel="close"
            width={16}
            color="var(--green-40)"
            hoverColor="var(--green-20)"
            customStyles={`
              position: absolute;
              top: 0;
              right: 0;
            `}
          />
          <img src={thumbnail} alt="Notification campaign" />
          <div className="wallet_banner_content">
            <h3>Odyssey week 8 is live!</h3>
            <p>Featuring 1inch.</p>
            <div className="wallet_banner_buttons">
              <SharedButton
                style={{ height: "auto" }}
                size="medium"
                type="tertiary"
                iconSmall="new-tab"
                onClick={() => {
                  window.open(`https://galxe.com/arbitrum`, "_blank")?.focus()
                }}
              >
                Start now
              </SharedButton>
              <SharedButton
                style={{ height: "auto", marginLeft: "auto" }}
                size="medium"
                type="tertiaryGray"
                iconSmall="new-tab"
                onClick={() => {
                  window.open(`https://galxe.com/arbitrum`, "_blank")?.focus() // TODO: this should be changed when the explainer is created
                }}
              >
                Learn more
              </SharedButton>
            </div>
          </div>
        </div>
      </SharedBanner>
      <WalletBannerSlideup
        isOpen={showDismissSlideup}
        onClose={() => setShowDismissSlideup(false)}
      />
      <style jsx>{`
        img {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          margin: 0 15px 0 5px;
        }
        h3 {
          margin: 0 0 5px;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          margin-right: 25px;
        }
        p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          color: var(--green-40);
        }
        .wallet_banner {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .subtitle {
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }
        .wallet_banner_buttons {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          margin-top: 5px;
        }
        .wallet_banner_content {
          width: 100%;
        }
        .wallet_banner_container {
          margin: 10px 0 25px;
          max-height: 200px;
        }
        .wallet_banner_container.hide {
          max-height: 0;
          margin: 0;
          pointer-events: none;
          opacity: 0;
          transition: all 500ms ease;
        }
      `}</style>
    </div>
  )
}
