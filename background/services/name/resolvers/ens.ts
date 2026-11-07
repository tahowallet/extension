import { BigNumber } from "ethers"
import { getAddress, hexDataLength, hexZeroPad } from "ethers/lib/utils"
import ChainService from "../../chain"
import type { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  SEPOLIA,
  ARBITRUM_SEPOLIA,
  OPTIMISM,
  POLYGON,
} from "../../../constants"
import { sameNetwork } from "../../../networks"
import { NameResolver } from "../name-resolver"

const ENS_SUPPORTED_NETWORKS = [
  ETHEREUM,
  POLYGON,
  OPTIMISM,
  ARBITRUM_ONE,
  SEPOLIA,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
]

/**
 * The ENS `addr(bytes32,uint256)` function selector, per ENSIP-9 and ENSIP-11.
 */
const ADDR_BYTES32_UINT256_SELECTOR = "0xf1cb7e06"

/**
 * Returns the ENS coin type under which a chain's address record is stored.
 * Mainnet uses SLIP-44 coin type 60; other EVM chains use the ENSIP-11 form,
 * `0x80000000 | chainId`.
 */
export function ensCoinTypeForChainID(chainID: string): number {
  if (chainID === ETHEREUM.chainID) {
    return 60
  }
  return (0x80000000 | Number(chainID)) >>> 0
}

export default function ensResolverFor(
  chainService: ChainService,
): NameResolver<"ENS"> {
  return {
    type: "ENS",
    // ENS records for every chain are controlled by the same name owner on
    // mainnet, so a matching address on two networks is the same owner's claim.
    recordOwnershipSpansNetworks: true,
    canAttemptNameResolution(): boolean {
      return true
    },
    canAttemptAvatarResolution(addressOrNameOnNetwork: NameOnNetwork): boolean {
      if ("name" in addressOrNameOnNetwork) {
        return this.canAttemptAddressResolution(addressOrNameOnNetwork)
      }
      return true
    },
    canAttemptAddressResolution({ name, network }: NameOnNetwork): boolean {
      return (
        name.endsWith(".eth") &&
        ENS_SUPPORTED_NETWORKS.some((supportedNetwork) =>
          sameNetwork(network, supportedNetwork),
        )
      )
    },

    async lookUpAddressForName({
      name,
      network,
    }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
      // Hard-coded to ETHEREUM: all ENS records, including L2 records, are
      // read from mainnet ENS.
      const provider = chainService.providerForNetwork(ETHEREUM)

      if (network.chainID === ETHEREUM.chainID) {
        const address = await provider?.resolveName(name)

        if (address === undefined || address === null) {
          return undefined
        }

        return {
          address,
          network,
        }
      }

      // Per ENSIP-11, each EVM chain has its own address record, stored on
      // mainnet ENS under that chain's coin type.
      const resolver = await provider?.getResolver(name)

      if (resolver === undefined || resolver === null) {
        return undefined
      }

      const coinType = ensCoinTypeForChainID(network.chainID)
      const bytes = await resolver._fetchBytes(
        ADDR_BYTES32_UINT256_SELECTOR,
        hexZeroPad(BigNumber.from(coinType).toHexString(), 32),
      )

      // Unset records are null or "0x"; EVM address records are 20 bytes.
      if (bytes === undefined || bytes === null) {
        return undefined
      }
      if (hexDataLength(bytes) !== 20) {
        return undefined
      }

      return {
        address: getAddress(bytes),
        network,
      }
    },
    async lookUpAvatar(
      addressOrNameOnNetwork: AddressOnNetwork | NameOnNetwork,
    ) {
      const { network } = addressOrNameOnNetwork

      const { name } =
        "name" in addressOrNameOnNetwork
          ? addressOrNameOnNetwork
          : ((await this.lookUpNameForAddress(addressOrNameOnNetwork)) ?? {
              name: undefined,
            })

      // Hard-coded to ETHEREUM to support ENS names on ETH L2's.
      const provider = chainService.providerForNetwork(ETHEREUM)

      if (name === undefined || provider === undefined) {
        return undefined
      }

      const { url: avatarUrn } = (await (
        await provider.getResolver(name)
      )?.getAvatar()) ?? { url: undefined }

      if (avatarUrn === undefined) {
        return undefined
      }

      return {
        uri: avatarUrn,
        network,
      }
    },
    async lookUpNameForAddress({
      address,
      network,
    }: AddressOnNetwork): Promise<NameOnNetwork | undefined> {
      const name = await chainService
        // Hard-coded to ETHEREUM to support ENS names on ETH L2's.
        .providerForNetwork(ETHEREUM)
        ?.lookupAddress(address)

      if (name === undefined || name === null) {
        return undefined
      }

      return {
        name,
        network,
      }
    },
  }
}
