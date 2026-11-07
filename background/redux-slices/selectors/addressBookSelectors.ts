import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import type { AddressOnNetwork } from "../../accounts"
import { EVMNetwork, sameNetwork } from "../../networks"
import { normalizeEVMAddress } from "../../lib/utils"
import type { AddressBookEntry } from "../address-book"
import { selectEVMNetworks } from "./networks"

export const selectAddressBookEntries = (
  state: RootState,
): AddressBookEntry[] => state.addressBook.entries

const selectControlCompatibility = (state: RootState) =>
  state.account.controlCompatibility

/**
 * The address and network a name is saved for, and any other networks the
 * user chose to apply it on.
 */
export type NameTarget = AddressOnNetwork & { additionalChainIDs?: string[] }

/**
 * Returns the chain IDs the address is known to be control-compatible with
 * from `network`. See RFB 5.
 *
 * Only signer-based compatibility is known synchronously, so for an address
 * the wallet has no signer for this is empty.
 */
function compatibleChainIDs(
  controlCompatibility: RootState["account"]["controlCompatibility"],
  { address, network }: AddressOnNetwork,
): Set<string> {
  return new Set(
    controlCompatibility[normalizeEVMAddress(address)]?.[network.chainID] ?? [],
  )
}

/**
 * Returns the chain IDs a name applies on: the network it's saved on, the
 * networks the user chose, and every network the address is known to be
 * control-compatible with from where it's saved.
 */
function applicableChainIDs(
  controlCompatibility: RootState["account"]["controlCompatibility"],
  target: NameTarget,
): Set<string> {
  return new Set([
    target.network.chainID,
    ...(target.additionalChainIDs ?? []),
    ...compatibleChainIDs(controlCompatibility, target),
  ])
}

/**
 * The networks a name applies on, starting with the network it's saved on.
 */
export const selectNameApplicableNetworks = createSelector(
  selectEVMNetworks,
  selectControlCompatibility,
  (_: RootState, target: NameTarget) => target,
  (evmNetworks, controlCompatibility, target): EVMNetwork[] => {
    const chainIDs = applicableChainIDs(controlCompatibility, target)

    return [
      target.network,
      ...evmNetworks.filter(
        (network) =>
          chainIDs.has(network.chainID) &&
          !sameNetwork(network, target.network),
      ),
    ]
  },
)

/**
 * The chain IDs a name saved for `addressOnNetwork` would apply on without
 * the user choosing them, because the wallet knows the same signer controls
 * the address there.
 */
export const selectKnownCompatibleChainIDs = createSelector(
  selectControlCompatibility,
  (_: RootState, addressOnNetwork: AddressOnNetwork) => addressOnNetwork,
  (controlCompatibility, addressOnNetwork): Set<string> =>
    compatibleChainIDs(controlCompatibility, addressOnNetwork),
)

/**
 * The address book entries that apply on `network`, one per address. As in
 * the name service, an entry saved on `network` wins over one that applies to
 * it from another network, and otherwise the most recently updated one wins.
 */
export const selectAddressBookEntriesForNetwork = createSelector(
  selectAddressBookEntries,
  selectControlCompatibility,
  (_: RootState, network: EVMNetwork) => network,
  (entries, controlCompatibility, network): AddressBookEntry[] => {
    // Entries arrive in write order; reversing before a stable sort makes the
    // latest write win when timestamps tie, as in the name service.
    const applicable = [...entries]
      .reverse()
      .filter((entry) =>
        applicableChainIDs(controlCompatibility, entry).has(network.chainID),
      )
      .sort((a, b) => {
        // As in the name service: saved on the network, then applied to it by
        // the user, then applying through control compatibility.
        const tier = (entry: AddressBookEntry) => {
          if (sameNetwork(entry.network, network)) return 0
          if (entry.additionalChainIDs.includes(network.chainID)) return 1
          return 2
        }
        return tier(a) - tier(b) || b.updatedAt - a.updatedAt
      })

    const seen = new Set<string>()
    return applicable.filter(({ address }) => {
      if (seen.has(address)) {
        return false
      }
      seen.add(address)
      return true
    })
  },
)
