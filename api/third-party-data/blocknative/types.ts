import { EthereumTransactionData as BlocknativeEthereumTransactionData } from "bnc-sdk/dist/types/src/interfaces"

// Some remedial typing for BlockNative; see blocknative/sdk#138 .
type EthereumNetBalanceChanges = {
  address: string
  balanceChanges: EthereumAssetBalanceChanges[]
}

type EthereumAssetBalanceChanges = {
  delta: string
  asset: AssetDetails
  breakdown: TransferDetails[]
}

type AssetDetails = {
  type: AssetType
  symbol: string
}

type AssetType = "ether" | "ERC20"

type TransferDetails = {
  counterparty: string
  amount: string
}

export type EthereumTransactionData = BlocknativeEthereumTransactionData & {
  netBalanceChanges?: EthereumNetBalanceChanges[]
}
