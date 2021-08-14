import { TokenList } from "@uniswap/token-lists"

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
  contractAddress: string
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
  amount: BigInt
}

/*
 * The primary type representing amounts in fungible asset transactions.
 */
export interface FungibleAssetAmount {
  asset: FungibleAsset
  amount: BigInt
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

/*
 * The primary type representing amounts in fungible asset transactions.
 */
export interface AnyAssetAmount {
  asset: AnyAsset
  amount: BigInt
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
  amounts: [BigInt, BigInt]
  time: number
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
  lastUpdated: number
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
  account: string
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
  blockHeight?: BigInt
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
  account: string
  network: Network
}

/*
 * Time measured in seconds since the Unix Epoch, January 1st, 1970 UTC
 */
export type UNIXTime = number

/*
 * An EVM-style block identifier, including difficulty, block height, and
 */
export interface EVMBlock {
  hash: string
  parentHash: string
  difficulty: BigInt
  blockHeight: number
  timestamp: UNIXTime
  network: Network
}

/*
 * An EVM-style block identifier that includes the base fee, as per EIP-1559.
 */
export interface EIP1559Block extends EVMBlock {
  baseFeePerGas: BigInt
}

export interface EVMTransaction {
  hash: string
  from: string
  to: string
  gas: BigInt
  gasPrice: BigInt | null
  maxFeePerGas: BigInt | null
  maxPriorityFeePerGas: BigInt | null
  input: string
  nonce: BigInt
  value: BigInt
  dataSource: "local" | "alchemy"
  asset: FungibleAsset
  network: Network
  /*
   * 0 - plain jane
   * 1 - EIP-2930
   * 2 - EIP-1559 transactions
   */
  type: 0 | 1 | 2 | null
}

export interface LegacyEVMTransaction extends EVMTransaction {
  gasPrice: BigInt
  type: 0 | null
  maxFeePerGas: null
  maxPriorityFeePerGas: null
}

export interface EIP1559Transaction extends EVMTransaction {
  gasPrice: null
  type: 1 | 2
  maxFeePerGas: BigInt
  maxPriorityFeePerGas: BigInt
}

export interface ConfirmedEVMTransaction extends EVMTransaction {
  blockHash: string
  blockHeight: number
}

export interface SignedEVMTransaction extends EVMTransaction {
  r: string
  s: string
  v: number
}

export interface SignedConfirmedEVMTransaction
  extends SignedEVMTransaction,
    ConfirmedEVMTransaction {}

export type AnyEVMTransaction =
  | EVMTransaction
  | ConfirmedEVMTransaction
  | SignedEVMTransaction
  | SignedConfirmedEVMTransaction
