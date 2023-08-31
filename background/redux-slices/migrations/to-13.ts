import { pick } from "lodash"

export const transactionPropertiesForUI = [
  "hash",
  "from",
  "fromTruncated",
  "to",
  "toTruncated",
  "infoRows",
  "asset.symbol",
  "asset.decimals",
  "value",
  "localizedDecimalValue",
  "blockHeight",
  "blockHash",
  "status",
  "network.chainID",
  "network.name",
  "network.baseAsset.symbol",
  "maxFeePerGas",
  "gasPrice",
  "gasUsed",
  "nonce",
  "annotation.blockTimestamp",
  "annotation.type",
  "annotation.source",
  "annotation.contractInfo.annotation.nameRecord.resolved.nameOnNetwork",
  "annotation.contractInfo.annotation.nameRecord.resolved.nameOnNetwork.name",
  "annotation.contractInfo.annotation.nameRecord.system",
  "annotation.recipient.address",
  "annotation.recipient.network",
  "annotation.recipient.annotation",
  "annotation.recipient.annotation.nonce",
  "annotation.recipient.annotation.balance",
  "annotation.recipient.annotation.nameRecord.resolved.nameOnNetwork",
  "annotation.recipient.annotation.nameRecord.resolved.nameOnNetwork.name",
  "annotation.recipient.annotation.nameRecord.system",
  "annotation.sender.address",
  "annotation.sender.network",
  "annotation.sender.annotation",
  "annotation.sender.annotation.nonce",
  "annotation.sender.annotation.balance",
  "annotation.sender.annotation.nameRecord.resolved.nameOnNetwork",
  "annotation.sender.annotation.nameRecord.resolved.nameOnNetwork.name",
  "annotation.sender.annotation.nameRecord.system",
  "annotation.spender.address",
  "annotation.spender.network",
  "annotation.spender.annotation",
  "annotation.spender.annotation.nonce",
  "annotation.spender.annotation.balance",
  "annotation.spender.annotation.nameRecord.nameOnNetwork",
  "annotation.spender.annotation.nameRecord.nameOnNetwork.name",
  "annotation.spender.annotation.nameRecord.system",
  "annotation.contractName",
  "annotation.transactionLogoURL",
  "annotation.assetAmount",
  "annotation.displayFields",
  "annotation.assetAmount.asset.symbol",
  "annotation.assetAmount.amount",
  "annotation.assetAmount.localizedDecimalAmount",
  "annotation.fromAssetAmount.asset.symbol",
  "annotation.toAssetAmount.asset.symbol",
]

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
        },
      )
    })
  })

  return typedState
}
