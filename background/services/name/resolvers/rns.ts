import RNSResolver from "@rsksmart/rns-resolver.js"
import { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import { ETHEREUM } from "../../../constants"
import { sameNetwork } from "../../../networks"
import { NameResolver } from "../name-resolver"

export default function rnsResolver(): NameResolver<"RNS"> {
  const resolver = RNSResolver.forRskMainnet({})

  return {
    type: "RNS",
    canAttemptNameResolution(): boolean {
      return true
    },
    canAttemptAvatarResolution(): boolean {
      return false
    },
    canAttemptAddressResolution({ name, network }: NameOnNetwork): boolean {
      return sameNetwork(network, ETHEREUM) && name.endsWith(".rsk")
    },

    async lookUpAddressForName({
      name,
      network,
    }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
      // TODO Set coin type based on network once multichain is supported
      // Default coin type is 137 (RSK - RBTC)
      const address = await resolver.addr(name)

      if (address === undefined || address === null) {
        return undefined
      }

      return {
        // TODO Default address encoding for rnsMainnetResolver exports
        // the address in EIP1191 checksum format which will be rejected by ethers
        // while signing transactions or other operations.
        // Let's use the lowercase address for now.
        address: address.toLowerCase(),
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
      const name = await resolver.reverse(address)

      if (address === undefined || address === null) {
        return undefined
      }

      return {
        name,
        network,
      }
    },
  }
}
