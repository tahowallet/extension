import { HexString, UNIXTime } from "./types"

export type NetworkFamily = "EVM" | "BTC"

// Should be structurally compatible with FungibleAsset or much code will
// likely explode.
type NetworkBaseAsset = {
  symbol: string
  name: string
  decimals: number
}

export type Network = {
  name: string
  baseAsset: NetworkBaseAsset
  family: NetworkFamily
  chainID?: string
}

export type NetworkSpecific = {
  homeNetwork: Network
}

export type SmartContract = NetworkSpecific & {
  contractAddress: HexString
}

/**
 * An EVM-style network which *must* include a chainID.
 */
export type EVMNetwork = Network & {
  chainID: string
  family: "EVM"
}

/**
 * An EVM-style block identifier, including difficulty, block height, and
 */
export type EVMBlock = {
  hash: string
  parentHash: string
  difficulty: bigint
  blockHeight: number
  timestamp: UNIXTime
  network: EVMNetwork
}

/**
 * An EVM-style block identifier that includes the base fee, as per EIP-1559.
 */
export type EIP1559Block = EVMBlock & {
  baseFeePerGas: bigint
}

export type AnyEVMBlock = EVMBlock | EIP1559Block

export type EVMTransaction = {
  hash: string
  from: HexString
  to?: HexString
  gasLimit: bigint
  gasPrice: bigint | null
  maxFeePerGas: bigint | null
  maxPriorityFeePerGas: bigint | null
  input: string | null
  nonce: number
  value: bigint
  blockHash: string | null
  blockHeight: number | null
  asset: NetworkBaseAsset
  network: EVMNetwork
  /*
   * 0 - plain jane
   * 1 - EIP-2930
   * 2 - EIP-1559 transactions
   */
  type: 0 | 1 | 2 | null
}

export type LegacyEVMTransaction = EVMTransaction & {
  gasPrice: bigint
  type: 0 | null
  maxFeePerGas: null
  maxPriorityFeePerGas: null
}

export type LegacyEVMTransactionRequest = Pick<
  LegacyEVMTransaction,
  "gasPrice" | "type" | "nonce" | "from" | "to" | "input" | "value"
> & {
  gasLimit: bigint
}

export type EIP1559Transaction = EVMTransaction & {
  gasPrice: null
  type: 1 | 2
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

export type EIP1559TransactionRequest = Pick<
  EIP1559Transaction,
  | "from"
  | "to"
  | "nonce"
  | "type"
  | "input"
  | "value"
  | "maxFeePerGas"
  | "maxPriorityFeePerGas"
> & {
  gasLimit: bigint
  chainID: EIP1559Transaction["network"]["chainID"]
}

export type ConfirmedEVMTransaction = EVMTransaction & {
  gasUsed: bigint
  blockHash: string
  blockHeight: number
}

export type AlmostSignedEVMTransaction = EVMTransaction & {
  r?: string
  s?: string
  v?: number
}

export type SignedEVMTransaction = EVMTransaction & {
  r: string
  s: string
  v: number
}

export type SignedConfirmedEVMTransaction = SignedEVMTransaction &
  ConfirmedEVMTransaction

export type AnyEVMTransaction =
  | EVMTransaction
  | ConfirmedEVMTransaction
  | AlmostSignedEVMTransaction
  | SignedEVMTransaction

export type BlockPrices = {
  network: Network
  blockNumber: number
  baseFeePerGas: bigint
  estimatedTransactionCount: number
  estimatedPrices: BlockEstimate[]
}

export type BlockEstimate = {
  confidence: number
  price: bigint | number
  maxPriorityFeePerGas: bigint | number
  maxFeePerGas: bigint | number
}
