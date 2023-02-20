import { ARBITRUM_ONE } from "@tallyho/tally-background/constants"
import { useEffect, useState } from "react"
import { i18n } from "../../../_locales/i18n"

type Campaign = {
  id: string
  startDate: Date
  endDate: Date
  chains: string[]
  buttons?: {
    primary?: {
      title: string
      link: string
    }
    secondary?: {
      title: string
      link: string
    }
  }
}

const bannerCampaigns: Campaign[] = [
  {
    id: "Odyssey",
    startDate: new Date("2022-11-07T04:00:00Z"),
    endDate: new Date("2022-12-26T04:00:00Z"),
    chains: [ARBITRUM_ONE.chainID],
    buttons: {
      primary: {
        title: i18n.t("wallet.banner.startNow"),
        link: "https://galxe.com/arbitrum",
      },
      secondary: {
        title: i18n.t("wallet.banner.learnMore"),
        link: "https://blog.taho.xyz/dogyssey-launch/?utm_campaign=arbitrum-support&utm_medium=in-wallet&utm_source=dogyssey-banner",
      },
    },
  },
]

export default function useBannerCampaigns(chainID: string): Campaign | null {
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    const currentDate = new Date()
    const relevantCampaings = bannerCampaigns.filter(
      (campaign) =>
        campaign.startDate <= currentDate &&
        currentDate <= campaign.endDate &&
        campaign.chains.includes(chainID)
    )

    setCurrentCampaign(relevantCampaings.reverse()[0] ?? null)
  }, [chainID])

  return currentCampaign
}
