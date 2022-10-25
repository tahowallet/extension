import { ARBITRUM_ONE } from "@tallyho/tally-background/constants"
import { useEffect, useState } from "react"
import { i18n } from "../../../_locales/i18n"

type Campaign = {
  id: string
  startDate: Date
  endDate: Date
  title: string
  description?: string
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

const odysseyProps = {
  chains: [ARBITRUM_ONE.chainID],
  buttons: {
    primary: {
      title: i18n.t("wallet.banner.startNow"),
      link: "https://galxe.com/arbitrum",
    },
    secondary: {
      title: i18n.t("wallet.banner.learnMore"),
      link: "https://galxe.com/arbitrum", // TODO will change - blogpost link
    },
  },
}

const bannerCampaigns: Campaign[] = [
  {
    id: "OdysseyWeek2",
    startDate: new Date("2022-11-07T04:00:00Z"),
    endDate: new Date("2022-11-14T04:00:00Z"),
    title: "Odyssey Week 2 is live!",
    description: "Explore Arbitrum and earn exclusive NFTs.",
    ...odysseyProps,
  },
  {
    id: "OdysseyWeek3",
    startDate: new Date("2022-11-14T04:00:00Z"),
    endDate: new Date("2022-11-21T04:00:00Z"),
    title: "Odyssey Week 3 is live!",
    description: "Featuring Aboard Exchange and TofuNFT.",
    ...odysseyProps,
  },
  {
    id: "OdysseyWeek4",
    startDate: new Date("2022-11-21T04:00:00Z"),
    endDate: new Date("2022-11-28T04:00:00Z"),
    title: "Odyssey Week 4 is live!",
    description: "Featuring Uniswap and Apex.",
    ...odysseyProps,
  },
  {
    id: "OdysseyWeek5",
    startDate: new Date("2022-11-28T04:00:00Z"),
    endDate: new Date("2022-12-04T04:00:00Z"),
    title: "Odyssey Week 5 is live!",
    description: "Featuring 1inch and Izumi/Yin Finance.",
    ...odysseyProps,
  },
  {
    id: "OdysseyWeek6",
    startDate: new Date("2022-12-05T04:00:00Z"),
    endDate: new Date("2022-12-11T04:00:00Z"),
    title: "Odyssey Week 6 is live!",
    description: "Featuring Dodo and Swapr.",
    ...odysseyProps,
  },
  {
    id: "OdysseyWeek7",
    startDate: new Date("2022-12-12T04:00:00Z"),
    endDate: new Date("2022-12-19T04:00:00Z"),
    title: "Odyssey Week 7 is live!",
    description: "Featuring TreasureDAO and Battlefly.",
    ...odysseyProps,
  },
  {
    id: "OdysseyWeek8",
    startDate: new Date("2022-12-19T04:00:00Z"),
    endDate: new Date("2022-12-26T04:00:00Z"),
    title: "Odyssey Week 8 is live!",
    description: "Featuring Ideamarket and Sushi.",
    ...odysseyProps,
  },
]

export default (chainID: string): Campaign | null => {
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
