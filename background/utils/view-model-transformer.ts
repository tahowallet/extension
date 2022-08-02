import { pick } from "lodash"

// We will have more filter functions like this to reduce store size > this eslint disable is temporary
// eslint-disable-next-line import/prefer-default-export
export function filterTransActionPropsForUI<T>(transactionData: {
  transaction: T
  forAccounts: string[]
}): { transaction: T; forAccounts: string[] } {
  const transactionPropertiesForUI = [
    "hash",
    "from",
    "to",
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
    "annotation.recipientAddress",
    "annotation.recipientName",
    "annotation.contractName",
    "annotation.transactionLogoURL",
    "annotation.assetAmount",
    "annotation.spenderAddress",
    "annotation.spenderName",
    "annotation.displayFields",
    "annotation.assetAmount.asset.symbol",
    "annotation.assetAmount.amount",
    "annotation.assetAmount.localizedDecimalAmount",
    "annotation.fromAssetAmount.asset.symbol",
    "annotation.toAssetAmount.asset.symbol",
  ]

  return {
    transaction: pick(transactionData.transaction, transactionPropertiesForUI),
    forAccounts: transactionData.forAccounts,
  } as { transaction: T; forAccounts: string[] }
}
