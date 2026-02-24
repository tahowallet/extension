import { JsonRpcProvider } from "@ethersproject/providers"
import { Contract, utils, constants } from "ethers"
import type { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import { NameResolver } from "../name-resolver"
import logger from "../../../lib/logger"

import { normalizeEVMAddress } from "../../../lib/utils"
import { ROOTSTOCK } from "../../../constants"

export default function rnsResolver(): NameResolver<"RNS"> {
  const rskNetworkProvider = new JsonRpcProvider("https://public-node.rsk.co")

  // REF: https://developers.rsk.co/rif/rns/architecture/registry/
  const RNS_REGISTRY_ADDRESS = "0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5"

  const stripHexPrefix = (hex: string): string => hex.slice(2)

  const RNS_REGISTRY_ABI = [
    "function resolver(bytes32 node) public view returns (address)",
  ]

  const RNS_ADDR_RESOLVER_ABI = [
    "function addr(bytes32 node) public view returns (address)",
  ]

  const RNS_NAME_RESOLVER_ABI = [
    "function name(bytes32 node) external view returns (string)",
  ]

  const rnsRegistryContract = new Contract(
    RNS_REGISTRY_ADDRESS,
    RNS_REGISTRY_ABI,
    rskNetworkProvider,
  )

  return {
    type: "RNS",
    canAttemptNameResolution({ network }): boolean {
      return network.chainID === ROOTSTOCK.chainID
    },
    canAttemptAvatarResolution(): boolean {
      return false
    },
    canAttemptAddressResolution({ name }: NameOnNetwork): boolean {
      return name.endsWith(".rsk")
    },

    async lookUpAddressForName({
      name,
      network,
    }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
      const nameHash = utils.namehash(name)
      const resolverAddress = await rnsRegistryContract.resolver(nameHash)

      if (resolverAddress === constants.AddressZero) {
        logger.warn("Domain has no resolver")
        return undefined
      }

      const addrResolverContract = new Contract(
        resolverAddress,
        RNS_ADDR_RESOLVER_ABI,
        rskNetworkProvider,
      )

      const address = await addrResolverContract.addr(nameHash)

      if (address === undefined || address === null) {
        return undefined
      }

      // TODO Support EIP-1191 compliant addresses for RSK network
      const normalizedAddress = normalizeEVMAddress(address)

      return {
        address: normalizedAddress,
        network,
      }
    },
    async lookUpAvatar() {
      return undefined
    },
    async lookUpNameForAddress({
      address,
      network,
    }: AddressOnNetwork): Promise<NameOnNetwork | undefined> {
      const reverseRecordHash = utils.namehash(
        `${stripHexPrefix(address)}.addr.reverse`,
      )

      const resolverAddress =
        await rnsRegistryContract.resolver(reverseRecordHash)

      if (resolverAddress === constants.AddressZero) {
        return undefined
      }

      const nameResolverContract = new Contract(
        resolverAddress,
        RNS_NAME_RESOLVER_ABI,
        rskNetworkProvider,
      )

      const name = await nameResolverContract.name(reverseRecordHash)

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
