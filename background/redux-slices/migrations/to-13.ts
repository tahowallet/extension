import { POLYGON } from "../../constants"

type ActivitiesState = {
  [key: string]: {
    [chainId: number]: {
      entities: {
        [address: number]: {
          infoRows: {
            value: {
              label: string
              value: string
              valueDetails: string
            }
          }
        }
      }
    }
  }
}

type State = {
  activities: ActivitiesState
}

export default (prevState: Record<string, unknown>): State => {
  const oldState = prevState as State

  const newActivities: ActivitiesState = Object.fromEntries(
    Object.entries(oldState.activities).map(([address, activitiesByChain]) => [
      address,
      Object.fromEntries(
        Object.entries(activitiesByChain).map(
          ([chainId, activitiesOnChain]) => {
            if (chainId !== POLYGON.chainID) return [chainId, activitiesOnChain]

            return [
              chainId,
              {
                ...activitiesOnChain,
                entities: Object.fromEntries(
                  Object.entries(activitiesOnChain.entities).map(
                    ([txHash, txDetails]) => {
                      const amount =
                        parseFloat(txDetails.infoRows.value.value) || 0
                      const newValue = `${amount} ${POLYGON.baseAsset.symbol}`
                      return [
                        txHash,
                        {
                          ...txDetails,
                          infoRows: {
                            ...txDetails.infoRows,
                            value: {
                              label: "Amount",
                              value: newValue,
                              valueDetail: newValue,
                            },
                          },
                        },
                      ]
                    }
                  )
                ),
              },
            ]
          }
        )
      ),
    ])
  )

  return {
    ...oldState,
    activities: newActivities,
  }
}
