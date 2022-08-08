import { pick } from "lodash"
import { transactionPropertiesForUI } from "../../utils/view-model-transformer"

type ActivitiesEntityState = {
  activities: {
    [address: string]: {
      [chainID: string]: {
        ids: string[]
        entities: {
          [transactionHash: string]: Record<string, unknown>
        }
      }
    }
  }
  [otherSlice: string]: unknown
}

export default (state: Record<string, unknown>): ActivitiesEntityState => {
  const typedState = state as ActivitiesEntityState

  Object.keys(typedState.activities).forEach((address) => {
    const networkIDs = Object.keys(typedState.activities[address])

    networkIDs.forEach((networkID) => {
      // Note: we are using entities in this slice, which stores all the keys of for the entities under the
      // ids array by design. So it's safe to use this array to iterate through the entities object, because
      // that's how the entities code itself works.
      typedState.activities[address][networkID].ids?.forEach(
        (transactionHash) => {
          const originalTx =
            typedState.activities[address][networkID].entities[transactionHash]

          // The activity slice at this moment can be big (~2 mb for the dev account which has ~150 tx at the moment.)
          // We are intentionally modifying the previous state to avoid the costly construction of the new object.
          // For a user with ~23mb store size a the debug script ran for 25s > this migration could be in the same magnitude
          // eslint-disable-next-line no-param-reassign
          typedState.activities[address][networkID].entities[transactionHash] =
            pick(originalTx, transactionPropertiesForUI)
        }
      )
    })
  })

  return typedState
}
