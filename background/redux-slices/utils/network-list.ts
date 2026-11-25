import { createAction } from "@reduxjs/toolkit"
import { DEFAULT_NETWORKS, NETWORK_BY_CHAIN_ID } from "../../constants"
import type { EVMNetwork } from "../../networks"

/**
 * Receives every network Taho knows about, built-in and custom, whenever the
 * list changes and once at startup.
 *
 * Note that this is defined apart from the networks slice so that every slice
 * keeping data by chain can prune on it without importing the networks slice,
 * which imports the accounts slice in turn.
 */
export const setEVMNetworks = createAction<EVMNetwork[]>(
  "networks/setEVMNetworks",
)

/**
 * Returns a predicate saying whether a chain's data should be dropped, given
 * a reported network list: true for chains missing from the list, so that
 * removing a custom network drops what was kept for it, and so that leftovers
 * from networks removed by older versions are swept at the next startup.
 *
 * Two kinds of chain are never dropped:
 *
 * - Built-in networks, even when missing from the list. A built-in network
 *   behind a feature flag can drop out of the list in one build and come back
 *   in the next, and the user's data on it should survive that.
 * - Anything at all, if the list doesn't hold every default network. Every
 *   complete list does, as the chain database writes the defaults before the
 *   list is first read, so a list without them can only be partial, and
 *   pruning by it would erase data for networks that still exist.
 *
 * @param networks The reported network list.
 */
export function chainIsDroppedBy(
  networks: EVMNetwork[],
): (chainID: string) => boolean {
  const listed = new Set(networks.map(({ chainID }) => chainID))
  const isComplete = DEFAULT_NETWORKS.every(({ chainID }) =>
    listed.has(chainID),
  )

  return (chainID) =>
    isComplete && !listed.has(chainID) && !(chainID in NETWORK_BY_CHAIN_ID)
}

/**
 * Returns the chain ID that a chain-scoped key starts with, such as `"1"` for
 * the asset ID `"1/base"` or the price key `"1/0xa0b8…"`, or `undefined` for
 * a key that isn't chain-scoped, such as a fiat currency's symbol.
 *
 * @param key An asset ID, price key, or similar `${chainID}/…` key.
 */
export function chainIDOfKey(key: string): string | undefined {
  const separator = key.indexOf("/")
  return separator === -1 ? undefined : key.slice(0, separator)
}
