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
  thumbnail: string
}

async function getLatestCampaigns(): Promise<Campaign[] | null> {
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
              space(alias: "tallyho") {
                campaigns(input: {
                  permissions: [PUBLIC]
                  listType: Newest
                }) {
                  list {
                    id
                    name
                    status
                    thumbnail
                  }
                }
              }
            }
          `,
        }),
      })
    ).json()) as { data: { space: { campaigns: { list: Campaign[] } } } }

    const latest = achievements.slice(0, 2)
    return latest.length ? latest : null
  } catch (error) {
    return null
  }
}

export default (): Campaign[] | null | undefined => {
  const [campaigns, setCampaigns] = useState<Campaign[] | null | undefined>(
    undefined
  )

  useEffect(() => {
    const fetchCampaign = async () => {
      const active = await getLatestCampaigns()
      setCampaigns(active)
    }

    fetchCampaign()
  }, [])

  return campaigns
}
