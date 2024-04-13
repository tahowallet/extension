import ChainService from "../../chain"
import { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  GOERLI,
  SEPOLIA,
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
  GOERLI,
  SEPOLIA,
  // TODO: Add ARBITRUM_SEPOLIA once the support is added (tracked in
  // https://github.com/ProjectOpenSea/opensea-js/issues/1201).
  AVALANCHE,
  BINANCE_SMART_CHAIN,
]

export default function ensResolverFor(
  chainService: ChainService,
): NameResolver<"ENS"> {
  return {
    type: "ENS",
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
    }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
      const address = await chainService
        // Use ENS to Ethereum mainnet to resolve addresses on EVM networks (Polygon, Arbitrum, etc..)
        .providerForNetwork(ETHEREUM)
        ?.resolveName(name)
      // FIXME .getResolver() can getName(name, coinType) or so then fall back to Ethereum

      if (address === undefined || address === null) {
        return undefined
      }

      return {
        address,
        network: ETHEREUM,
      }
    },
    async lookUpAvatar(
      addressOrNameOnNetwork: AddressOnNetwork | NameOnNetwork,
    ) {
      const { network } = addressOrNameOnNetwork

      const { name } =
        "name" in addressOrNameOnNetwork
          ? addressOrNameOnNetwork
          : (await this.lookUpNameForAddress(addressOrNameOnNetwork)) ?? {
              name: undefined,
            }

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
        network: ETHEREUM,
      }
    },
  }
}
