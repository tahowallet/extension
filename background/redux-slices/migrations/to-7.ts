// This migration adds timestamps for activites directly to the activity
// objects, then deletes the `blocks` key from the networks slice to save on
// space.

type OldState = {
  activities: {
    [address: string]: {
      ids: string[]
      entities: {
        [id: string]: {
          blockHeight: number | null
          annotation: Record<string, unknown>
        }
      }
    }
  }
  networks: {
    evm: {
      "1": {
        blocks?: {
          [blockHeight: number]: {
            timestamp: number | undefined
          }
        }
        blockHeight: number
      }
    }
  }
}

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const oldState = prevState as OldState
  const { activities } = oldState

  type NewEntity = {
    [id: string]: {
      blockHeight: number | null
      annotation: {
        blockTimestamp?: number
      }
    }
  }
  type NewActivitiesState = {
    [address: string]: {
      ids: string[]
      entities: NewEntity
    }
  }

  const newActivitiesState: NewActivitiesState = {}

  const { blocks } = oldState.networks.evm["1"]

  // Grab timestamps off of blocks, add them as activity annotations
  Object.keys(activities).forEach((accountActivitiesAddress: string) => {
    const accountActivities = activities[accountActivitiesAddress]
    const newEntities: NewEntity = {}
    accountActivities.ids.forEach((activityItemID: string) => {
      const activityItem = accountActivities.entities[activityItemID]
      newEntities[activityItemID] = {
        ...activityItem,
        annotation: {
          ...activityItem.annotation,
          blockTimestamp: activityItem.blockHeight
            ? blocks && blocks[activityItem.blockHeight]?.timestamp
            : undefined,
        },
      }
    })
    newActivitiesState[accountActivitiesAddress] = {
      ids: accountActivities.ids,
      entities: newEntities,
    }
  })

  const { ...newState } = oldState
  // Remove blocks
  delete newState.networks.evm["1"].blocks // Only mainnet exists at this time
  return {
    ...newState,
    activities: newActivitiesState,
  }
}
