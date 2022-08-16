import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import { Slip44CoinType } from "./constants/coin-types"
import { HexString, UNIXTime } from "./types"
import type { CoinGeckoAsset } from "./assets"
import type {
  EnrichedEIP1559TransactionSignatureRequest,
  EnrichedEVMTransactionSignatureRequest,
  PartialTransactionRequestWithFrom,
} from "./services/enrichment"

/**
 * Each supported network family is generally incompatible with others from a
 * transaction, consensus, and/or wire format perspective.
 */
export type NetworkFamily = "EVM" | "BTC"

// Should be structurally compatible with FungibleAsset or much code will
// likely explode.
export type NetworkBaseAsset = {
  symbol: string
  name: string
  decimals: number
  coinType: Slip44CoinType
}

/**
 * Represents a cryptocurrency network; these can potentially be L1 or L2.
 */
export type Network = {
  // Considered a primary key; two Networks should never share a name.
  name: string
  baseAsset: NetworkBaseAsset & CoinGeckoAsset
  family: NetworkFamily
  chainID?: string
  coingeckoPlatformID: string
}

/**
 * Mixed in to any other type, gives it the property of belonging to a
 * particular network. Often used to delineate contracts or assets that are on
 * a single network to distinguish from other versions of them on different
 * networks.
 */
export type NetworkSpecific = {
  homeNetwork: AnyNetwork
}

/**
 * A smart contract on any network that tracks smart contracts via a hex
 * contract address.
 */
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
 * Union type that allows narrowing to particular network subtypes.
 */
export type AnyNetwork = EVMNetwork

/**
 * An EVM-style block identifier, including difficulty, block height, and
 * self/parent hash data.
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

/**
 * A pre- or post-EIP1559 EVM-style block.
 */
export type AnyEVMBlock = EVMBlock | EIP1559Block

/**
 * Base EVM transaction fields; these are further specialized by particular
 * subtypes.
 */
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

/**
 * A legacy (pre-EIP1559) EVM transaction, whose type is fixed to `0` and whose
 * EIP1559-related fields are mandated to be `null`, while `gasPrice` must be
 * set.
 */
export type LegacyEVMTransaction = EVMTransaction & {
  gasPrice: bigint
  type: 0 | null
  maxFeePerGas: null
  maxPriorityFeePerGas: null
}

/**
 * A legacy (pre-EIP1559) EVM transaction _request_, meaning only fields that
 * are used to post a transaction for inclusion are required, including the gas
 * limit used to limit the gas expenditure on a transaction. This is used to
 * request a signed transaction, and does not include signature fields.
 *
 * Nonce is permitted to be `undefined` as Tally internals can and often do
 * populate the nonce immediately before a request is signed.
 */
export type LegacyEVMTransactionRequest = Pick<
  LegacyEVMTransaction,
  "gasPrice" | "type" | "from" | "to" | "input" | "value" | "network"
> & {
  chainID: LegacyEVMTransaction["network"]["chainID"]
  gasLimit: bigint
  nonce?: number
}

/**
 * An EIP1559 EVM transaction, whose type is set to `1` or `2` per EIP1559 and
 * whose EIP1559-related fields are required, while `gasPrice` (pre-EIP1559) is
 * mandated to be `null`.
 */
export type EIP1559Transaction = EVMTransaction & {
  gasPrice: null
  type: 1 | 2
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

/**
 * An EIP1559 EVM transaction _request_, meaning only fields used to post a
 * transaction for inclusion are required, including the gas limit used to
 * limit the gas expenditure on a transaction. This is used to request a signed
 * transaction, and does not include signature fields.
 *
 * Nonce is permitted to be `undefined` as Tally internals can and often do
 * populate the nonce immediately before a request is signed.
 */
export type EIP1559TransactionRequest = Pick<
  EIP1559Transaction,
  | "from"
  | "to"
  | "type"
  | "input"
  | "value"
  | "maxFeePerGas"
  | "maxPriorityFeePerGas"
  | "network"
> & {
  gasLimit: bigint
  chainID: EIP1559Transaction["network"]["chainID"]
  nonce?: number
}

export type TransactionRequest =
  | EIP1559TransactionRequest
  | LegacyEVMTransactionRequest

export type TransactionRequestWithNonce = TransactionRequest & { nonce: number }

/**
 * EVM log metadata, including the contract address that generated the log, the
 * full log data, and the indexed log topics.
 */
export type EVMLog = {
  contractAddress: HexString
  data: HexString
  topics: HexString[]
}

/**
 * A confirmed EVM transaction that has been included in a block. Includes
 * information about the gas actually used to execute the transaction, as well
 * as the block hash and block height at which the transaction was included.
 */
export type ConfirmedEVMTransaction = EVMTransaction & {
  gasUsed: bigint
  status: number
  blockHash: string
  blockHeight: number
  logs: EVMLog[] | undefined
}

/**
 * An EVM transaction that failed to be confirmed. Includes information about
 * the error if available.
 */
export type FailedConfirmationEVMTransaction = EVMTransaction & {
  status: 0
  error?: string
  blockHash: null
  blockHeight: null
}

/**
 * An almost-signed EVM transaction, meaning a transaction that knows about the
 * signature fields but may not have them all populated yet.
 */
export type AlmostSignedEVMTransaction = EVMTransaction & {
  r?: string
  s?: string
  v?: number
}

/**
 * An EVM transaction with signature fields filled in and ready for broadcast
 * to the network.
 */
type SignedEIP1559Transaction = EVMTransaction & {
  r: string
  s: string
  v: number
}

/**
 * A Legacy EVM transaction with signature fields filled in and ready for broadcast
 * to the network.
 */
export type SignedLegacyEVMTransaction = LegacyEVMTransaction & {
  r: string
  s: string
  v: number
}

export type SignedTransaction =
  | SignedEIP1559Transaction
  | SignedLegacyEVMTransaction

/**
 * An EVM transaction that has all signature fields and has been included in a
 * block.
 */
export type SignedConfirmedEVMTransaction = SignedEIP1559Transaction &
  ConfirmedEVMTransaction

/**
 * Any EVM transaction, confirmed or unconfirmed and signed or unsigned.
 */
export type AnyEVMTransaction =
  | EVMTransaction
  | ConfirmedEVMTransaction
  | AlmostSignedEVMTransaction
  | SignedTransaction
  | FailedConfirmationEVMTransaction

/**
 * The estimated gas prices for including a transaction in the next block.
 *
 * The estimated prices include a percentage (confidence) that a transaction with
 * the given `baseFeePerGas` will be included in the next block.
 */
export type BlockPrices = {
  network: Network
  blockNumber: number
  baseFeePerGas: bigint
  /**
   * An estimate of how many transactions will be included in the next block.
   */
  estimatedTransactionCount: number | null
  /**
   * A choice of gas price parameters with associated confidence that a
   * transaction using those parameters will be included in the next block.
   */
  estimatedPrices: BlockEstimate[]
  /**
   * Whether these prices were estimated locally or via a third party provider
   */
  dataSource: "local" | "blocknative"
}

/**
 * An estimate of the confidence that a given set of gas price parameters
 * will result in the inclusion of a transaction in the next block.
 */
export type BlockEstimate = {
  confidence: number
  /**
   * For legacy (pre-EIP1559) transactions, the gas price that results in the
   * above likelihood of inclusion.
   */
  price?: bigint
  /**
   * For EIP1559 transactions, the max priority fee per gas that results in the
   * above likelihood of inclusion.
   */
  maxPriorityFeePerGas: bigint
  /**
   * For EIP1559 transactions, the max fee per gas that results in the above
   * likelihood of inclusion.
   */
  maxFeePerGas: bigint
}

/**
 * Tests whether two networks should be considered the same. Verifies family,
 * chainID, and name.
 */
export function sameNetwork(
  network1: AnyNetwork,
  network2: AnyNetwork
): boolean {
  return (
    network1.family === network2.family &&
    network1.chainID === network2.chainID &&
    network1.name === network2.name
  )
}

/**
 * Returns a 0x-prefixed hexadecimal representation of a number or string chainID
 * while also handling cases where an already hexlified chainID is passed in.
 */
export function toHexChainID(chainID: string | number): string {
  if (typeof chainID === "string" && chainID.startsWith("0x")) {
    return chainID
  }
  return `0x${BigInt(chainID).toString(16)}`
}

// There is probably some clever way to combine the following type guards into one function

export const isEIP1559TransactionRequest = (
  transactionRequest:
    | AnyEVMTransaction
    | EthersTransactionRequest
    | Partial<PartialTransactionRequestWithFrom>
): transactionRequest is EIP1559TransactionRequest =>
  "maxFeePerGas" in transactionRequest &&
  "maxPriorityFeePerGas" in transactionRequest

export const isEIP1559SignedTransaction = (
  signedTransaction: SignedTransaction
): signedTransaction is SignedEIP1559Transaction =>
  "maxFeePerGas" in signedTransaction &&
  "maxPriorityFeePerGas" in signedTransaction &&
  signedTransaction.maxFeePerGas !== null &&
  signedTransaction.maxPriorityFeePerGas !== null

export const isEIP1559EnrichedTransactionSignatureRequest = (
  transactionSignatureRequest: EnrichedEVMTransactionSignatureRequest
): transactionSignatureRequest is EnrichedEIP1559TransactionSignatureRequest =>
  "maxFeePerGas" in transactionSignatureRequest &&
  "maxPriorityFeePerGas" in transactionSignatureRequest
