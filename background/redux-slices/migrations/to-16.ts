import { NETWORK_BY_CHAIN_ID } from "../../constants"
import { EVMNetwork } from "../../networks"

type OldState = {
  activities: {
    [address: string]: {
      [chainID: string]: {
        entities: {
          [txHash: string]: {
            hash: string
            annotation: {
              type: string
              spenderName: string
              spenderAddress: string
              spender?: {
                address: string
                network: EVMNetwork
                annotation: {
                  nameOnNetwork: {
                    name: string
                    network: EVMNetwork
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  [otherSlice: string]: unknown
}

type NewState = {
  activities: {
    [address: string]: {
      [chainID: string]: {
        entities: {
          [txHash: string]: {
            hash: string
            annotation: {
              type: string
              spender: {
                address: string
                network: EVMNetwork
                annotation: {
                  nameOnNetwork?: {
                    name: string
                    network: EVMNetwork
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  const newState = {
    ...typedPrevState,
  } as NewState

  Object.keys(typedPrevState.activities).forEach((address) => {
    Object.keys(typedPrevState.activities[address]).forEach((chainID) => {
      Object.keys(typedPrevState.activities[address][chainID].entities).forEach(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_) => {
          Object.values(
            typedPrevState.activities[address][chainID].entities
          ).forEach((activityItem) => {
            const { annotation } = activityItem
            if (
              annotation &&
              annotation.type === "asset-approval" &&
              (annotation.spenderAddress || annotation.spenderName)
            ) {
              const spender = {
                address: annotation.spenderAddress,
                network: NETWORK_BY_CHAIN_ID[chainID],
                annotation: annotation.spenderName
                  ? {
                      nameOnNetwork: {
                        name: annotation.spenderName,
                        network: NETWORK_BY_CHAIN_ID[chainID],
                      },
                    }
                  : {},
              }

              const { spenderName, spenderAddress, ...oldAnnotationProps } =
                annotation

              newState.activities[address][chainID].entities[
                activityItem.hash
              ] = {
                ...activityItem,
                annotation: {
                  ...oldAnnotationProps,
                  spender,
                },
              }
            }
          })
        }
      )
    })
  })

  return newState
}
