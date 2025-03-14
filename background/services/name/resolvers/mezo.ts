import { fetchJson } from "@ethersproject/web"
import { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import { MEZO_TESTNET } from "../../../constants"
import { sameNetwork } from "../../../networks"
import { NameResolver } from "../name-resolver"
import { normalizeEVMAddress } from "../../../lib/utils"

const MEZO_SUPPORTED_NETWORKS = [MEZO_TESTNET]

export default function mezoResolver(): NameResolver<"MEZO"> {
  return {
    type: "MEZO",
    canAttemptNameResolution(): boolean {
      return true
    },
    canAttemptAvatarResolution(): boolean {
      return false
    },
    canAttemptAddressResolution({ name, network }: NameOnNetwork): boolean {
      return (
        name.endsWith(".mezo") &&
        MEZO_SUPPORTED_NETWORKS.some((supportedNetwork) =>
          sameNetwork(network, supportedNetwork),
        )
      )
    },

    async lookUpAddressForName({
      name,
      network,
    }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
      type ResolveNameData = {
        mezoId: string
        evmAddress: string
        btcAddress: null | string
      }

      const data: ResolveNameData = await fetchJson(
        `https://portal.api.mezo.org/api/v2/external/accounts?mezoId=${name}`,
      )

      return {
        address: normalizeEVMAddress(data.evmAddress),
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
      type ReverseLookupData = {
        mezoId: string
        linkedAccounts: {
          type: string
          evmAddress: string
        }[]
      }

      const data: ReverseLookupData = await fetchJson(
        `https://portal.api.mezo.org/accounts/${address}`,
      )

      return {
        name: data.mezoId,
        network,
      }
    },
  }
}
