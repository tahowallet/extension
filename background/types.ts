import { TokenList } from "@uniswap/token-lists"

export type HexString = string

export interface TokenListCitation {
  name: string
  url: string
  logoURL?: string
}

export interface TokenListAndReference {
  url: string
  tokenList: TokenList
}

export interface AssetMetadata {
  coinGeckoId?: string
  logoURL?: string
  websiteURL?: string
  tokenLists: TokenListCitation[]
}

export interface Asset {
  symbol: string
  name: string
  metadata?: AssetMetadata
}

export interface CoinGeckoAsset extends Asset {
  metadata: Asset["metadata"] & {
    coinGeckoId: string
  }
}

/*
 * Fungible assets include coins, currencies, and many tokens.
 */
export interface FungibleAsset extends Asset {
  decimals: number
}

export type FiatCurrency = FungibleAsset

export type NetworkFamily = "EVM" | "BTC"

export interface Network {
  name: string
  baseAsset: FungibleAsset
  family: NetworkFamily
  chainID?: string
}

export type NetworkSpecific = {
  homeNetwork: Network
}

export type SmartContract = NetworkSpecific & {
  contractAddress: HexString
}

export type NetworkSpecificAsset = NetworkSpecific & Asset

export type SmartContractAsset = SmartContract & Asset

export type SmartContractFungibleAsset = FungibleAsset & SmartContract

/*
 * The primary type representing amounts in fungible or non-fungible asset
 * transactions.
 */
export interface AssetAmount {
  asset: Asset
  amount: bigint
}

/*
 * The primary type representing amounts in fungible asset transactions.
 */
export interface FungibleAssetAmount {
  asset: FungibleAsset
  amount: bigint
}

/*
 * A union of all assets we expect to price.
 */
export type AnyAsset =
  | Asset
  | NetworkSpecificAsset
  | FiatCurrency
  | FungibleAsset
  | SmartContractFungibleAsset

export function isSmartContractFungibleAsset(
  asset: AnyAsset
): asset is SmartContractFungibleAsset {
  return "homeNetwork" in asset && "contractAddress" in asset
}

/*
 * The primary type representing amounts in fungible asset transactions.
 */
export interface AnyAssetAmount {
  asset: AnyAsset
  amount: bigint
}

/*
 * Represents a price relationship between two assets, fungible or non-fungible,
 * at a given time.
 *
 * PricePoint is the preferred price type, as it includes both sides of a pair
 * and doesn't give up any accuracy.
 */
export interface PricePoint {
  pair: [AnyAsset, AnyAsset]
  amounts: [bigint, bigint]
  time: UNIXTime
}

/*
 * Used to represent the price (per single unit) of an asset, fungible or
 * non-fungible, against a fungible asset. Note the fungible asset can be
 * something like an ERC-20 token or fiat currency.
 *
 * In almost all cases, PricePoint should be preferred. UnitPricePoint should
 * only be used when the details of the other side of a price pair are unknown.
 */
export interface UnitPricePoint {
  unitPrice: AnyAssetAmount
  time: UNIXTime
}

/*
 * An account balance at a particular time and block height, on a particular
 * network. Flexible enough to represent base assets like ETH and BTC as well
 * application-layer tokens like ERC-20s.
 */
export interface AccountBalance {
  /*
   * The account whose balance was measured.
   */
  account: HexString
  /*
   * The measured balance and the asset in which it's denominated.
   */
  assetAmount: AnyAssetAmount
  /*
   * The network on which the account balance was measured.
   */
  network: Network
  /*
   * The block height at while the balance measurement is valid.
   */
  blockHeight?: bigint
  /*
   * When the account balance was measured, using Unix epoch timestamps.
   */
  retrievedAt: number
  /*
   * A loose attempt at tracking balance data provenance, in case providers
   * disagree and need to be disambiguated.
   */
  dataSource: "alchemy" | "local"
}

/*
 * An account on a particular network. That's it. That's the comment.
 */
export interface AccountNetwork {
  account: HexString
  network: Network
}

/*
 * Time measured in seconds since the Unix Epoch, January 1st, 1970 UTC
 */
export type UNIXTime = number

/*
 * An EVM-style network which *must* include a chainID.
 */
export interface EVMNetwork extends Network {
  chainID: string
  family: "EVM"
}

/*
 * An EVM-style block identifier, including difficulty, block height, and
 */
export interface EVMBlock {
  hash: string
  parentHash: string
  difficulty: bigint
  blockHeight: number
  timestamp: UNIXTime
  network: EVMNetwork
}

/*
 * An EVM-style block identifier that includes the base fee, as per EIP-1559.
 */
export interface EIP1559Block extends EVMBlock {
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
  asset: FungibleAsset
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

export type AssetTransfer = {
  network: Network
  assetAmount: AssetAmount
  from: HexString
  to: HexString
  dataSource: "alchemy" | "local"
  txHash: string
}

// KEY TYPES

export enum KeyringTypes {
  mnemonicBIP39S128 = "mnemonic#bip39:128",
  mnemonicBIP39S256 = "mnemonic#bip39:256",
  metamaskMnemonic = "mnemonic#metamask",
  singleSECP = "single#secp256k1",
}
export type MsgParams = {
  data: string
  from: string
}

// TODO: type declarations in @tallyho/eth-hd-tree
export interface Seed {
  data: string // seed material
  type: KeyringTypes
  index: number // the current account index
  reference: string // unique reference
  path: string // default path to derive new keys
}

export type ImportData = {
  type: keyof typeof KeyringTypes
  data: string
  password?: string
}

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

export type ActivityItem = AnyEVMTransaction & {
  timestamp?: string
  value: bigint
  from?: string
  isSent?: boolean
}
