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
 * Returns the chain IDs a name saved for `addressOnNetwork` applies on: the
 * network it's saved on, and every network the address is known to be
 * control-compatible with from there. See RFB 5.
 *
 * Only signer-based compatibility is known synchronously, so for an address
 * the wallet has no signer for this is just the network it's saved on.
 */
function applicableChainIDs(
  controlCompatibility: RootState["account"]["controlCompatibility"],
  { address, network }: AddressOnNetwork,
): Set<string> {
  return new Set([
    network.chainID,
    ...(controlCompatibility[normalizeEVMAddress(address)]?.[network.chainID] ??
      []),
  ])
}

/**
 * The networks a name saved for `addressOnNetwork` applies on, starting with
 * the network it's saved on.
 */
export const selectNameApplicableNetworks = createSelector(
  selectEVMNetworks,
  selectControlCompatibility,
  (_: RootState, addressOnNetwork: AddressOnNetwork) => addressOnNetwork,
  (evmNetworks, controlCompatibility, addressOnNetwork): EVMNetwork[] => {
    const chainIDs = applicableChainIDs(controlCompatibility, addressOnNetwork)

    return [
      addressOnNetwork.network,
      ...evmNetworks.filter(
        (network) =>
          chainIDs.has(network.chainID) &&
          !sameNetwork(network, addressOnNetwork.network),
      ),
    ]
  },
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
        const aOnNetwork = sameNetwork(a.network, network)
        const bOnNetwork = sameNetwork(b.network, network)
        if (aOnNetwork !== bOnNetwork) {
          return aOnNetwork ? -1 : 1
        }
        return b.updatedAt - a.updatedAt
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
