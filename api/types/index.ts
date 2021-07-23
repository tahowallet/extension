export interface AssetMetadata {
  coinGeckoURL?: string
  imageURL?: string
  websiteURL?: string
}

export interface Asset {
  symbol: string
  name: string
  metadata?: AssetMetadata
}

export type FungibleAsset = Asset & {
  decimals: BigInt
}

export type NetworkFamily = 'EVM' | 'BTC'

export interface Network {
  name: string
  baseAsset: Asset
  family: NetworkFamily
  chainId?: string
}

export type NetworkSpecificSmartContract = {
  homeNetwork: Network
  contractAddress: string
}

export type NetworkAsset = Asset & NetworkSpecificSmartContract

export type NetworkFungibleAsset = FungibleAsset & NetworkSpecificSmartContract
