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

async function getLatestCampaigns(): Promise<Campaign[]> {
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

  return achievements.slice(0, 2)
}

export default function useArbitrumCampaigns(): {
  campaigns: Campaign[]
  loading: boolean
  error: boolean
} {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchCampaign = async () => {
      const active = await getLatestCampaigns()
      setError(!active.length)
      setCampaigns(active)
    }

    setLoading(true)

    fetchCampaign()
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return { campaigns, loading, error }
}
