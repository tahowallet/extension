import { fetchWithTimeout } from "@tallyho/tally-background/utils/fetching"
import { useEffect, useState } from "react"

enum CampaignStatus {
  Draft = "Draft",
  Active = "Active",
  NotStarted = "NotStarted",
  Expired = "Expired",
  CapReached = "CapReached",
  Deleted = "Deleted",
}

type Campaign = {
  id: string
  name: string
  status: CampaignStatus
  description: string
  thumbnail: string
  startTime: number
  endTime: number
}

async function getActiveCampaign(): Promise<Campaign | null> {
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
    ).json()) as { data: { space: { campaigns: { list: Campaign[] } } } }

    const activeCampaign = achievements
      .filter((item) => item.status === CampaignStatus.Active)
      .sort((item1, item2) => item1.startTime - item2.startTime)

    return activeCampaign.reverse()[0] ?? null
  } catch (error) {
    return null
  }
}

export default (): Campaign | null => {
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    const fetchCampaign = async () => {
      const active = await getActiveCampaign()
      setCampaign(active)
    }

    fetchCampaign()
  }, [])

  return campaign
}
