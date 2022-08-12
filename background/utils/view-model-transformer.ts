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

export function filterTransactionPropsForUI<T>(transactionData: {
  transaction: T
  forAccounts: string[]
}): { transaction: T; forAccounts: string[] } {
  return {
    transaction: pick(transactionData.transaction, transactionPropertiesForUI),
    forAccounts: transactionData.forAccounts,
  } as { transaction: T; forAccounts: string[] }
}
