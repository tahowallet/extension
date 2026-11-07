import type { AnyAssetAmount, SmartContractFungibleAsset } from "./assets"
import type {
  AnyNetwork,
  EVMNetwork,
  NetworkBaseAsset,
  SparkNetwork,
} from "./networks"
import type { HexString, SparkAddress } from "./types"

/**
 * An account balance at a particular time and block height, on a particular
 * network. Flexible enough to represent base assets like ETH as well
 * application-layer tokens like ERC-20s.
 */
export type AccountBalance = {
  /**
   * The address whose balance was measured.
   */
  address: HexString
  /**
   * The measured balance and the asset in which it's denominated.
   */
  assetAmount: AnyAssetAmount<NetworkBaseAsset | SmartContractFungibleAsset>
  /**
   * The network on which the account balance was measured.
   */
  network: EVMNetwork
  /**
   * The block height at while the balance measurement is valid.
   */
  blockHeight?: bigint
  /**
   * When the account balance was measured, using Unix epoch timestamps.
   */
  retrievedAt: number
  /**
   * A loose attempt at tracking balance data provenance, in case providers
   * disagree and need to be disambiguated.
   */
  dataSource: "boar" | "generic-rpc" | "local"
}

/**
 * The address format a network family uses: hex for EVM networks, bech32m
 * Spark addresses for Spark networks.
 */
export type AddressFor<N extends AnyNetwork> = N extends SparkNetwork
  ? SparkAddress
  : HexString

/**
 * An address on a particular network. That's it. That's the comment.
 *
 * Defaults to EVM networks, which is what the bulk of the codebase (chain
 * service, signers, dapp provider) handles; code that handles any network
 * family uses `AnyAddressOnNetwork` and narrows with `isEVMAddressOnNetwork`.
 */
export type AddressOnNetwork<N extends AnyNetwork = EVMNetwork> = {
  address: AddressFor<N>
  network: N
}

export type EVMAddressOnNetwork = AddressOnNetwork<EVMNetwork>
export type SparkAddressOnNetwork = AddressOnNetwork<SparkNetwork>
export type AnyAddressOnNetwork = EVMAddressOnNetwork | SparkAddressOnNetwork

export function isEVMAddressOnNetwork(
  addressOnNetwork: AnyAddressOnNetwork,
): addressOnNetwork is EVMAddressOnNetwork {
  return addressOnNetwork.network.family === "EVM"
}

export function isSparkAddressOnNetwork(
  addressOnNetwork: AnyAddressOnNetwork,
): addressOnNetwork is SparkAddressOnNetwork {
  return addressOnNetwork.network.family === "spark"
}

/**
 * A domain name, with a particular network.
 */
export type NameOnNetwork = {
  name: string
  network: EVMNetwork
}
