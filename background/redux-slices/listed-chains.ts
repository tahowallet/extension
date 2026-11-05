import type { Action } from "redux"
import type { AccountBalance, AddressOnNetwork } from "../accounts"
import type { AnyEVMBlock } from "../networks"
import { loadAccount, updateAccountBalance } from "./accounts"
import { blockSeen, networkReachabilityChanged } from "./networks"

/**
 * The slice of state the guard reads: the network list the background last
 * reported.
 */
type ListedNetworksState = {
  networks?: { evmNetworks?: { [chainID: string]: unknown } }
}

/**
 * Returns whether the network list in the given state includes the chain.
 *
 * Note that an empty list counts as including every chain: the list is empty
 * only before the background has reported it for the first time, as on a
 * fresh install, and nothing can be judged unlisted until then.
 */
export function isListedChain(
  state: ListedNetworksState | undefined,
  chainID: string,
): boolean {
  const evmNetworks = state?.networks?.evmNetworks ?? {}
  return Object.keys(evmNetworks).length === 0 || chainID in evmNetworks
}

/**
 * Returns the action to reduce in place of the given one, dropping whatever
 * it would write for chains missing from the network list, or `undefined` if
 * nothing would be left to write.
 *
 * A removed network's data comes back when a write for it lands after the
 * removal: a balance load that started before the network was removed, or a
 * stale popup reporting activity on the network it still shows as selected,
 * which re-tracks the account and has `loadAccount` recreate the chain's
 * entry. Each of those would bring back a chain the user can no longer see or
 * remove, whose balances still count toward the portfolio total. Checking
 * here covers every such writer at once, wherever it was dispatched from.
 *
 * Note that only writes that create per-chain entries are checked. Writes
 * that only update existing entries, like ENS names, have nothing to update
 * once the chain's entries are gone.
 *
 * @param state The state the action is about to be reduced against.
 * @param action The action about to be reduced.
 */
export function withoutUnlistedChainWrites<A extends Action>(
  state: ListedNetworksState | undefined,
  action: A,
): A | undefined {
  const isListed = (chainID: string) => isListedChain(state, chainID)

  if (loadAccount.match(action)) {
    const { payload }: { payload: AddressOnNetwork } = action
    return isListed(payload.network.chainID) ? action : undefined
  }

  if (updateAccountBalance.match(action)) {
    const { balances }: { balances: AccountBalance[] } = action.payload
    const listedBalances = balances.filter(({ network }) =>
      isListed(network.chainID),
    )
    if (listedBalances.length === balances.length) {
      return action
    }
    if (listedBalances.length === 0) {
      return undefined
    }
    return {
      ...action,
      payload: { ...action.payload, balances: listedBalances },
    }
  }

  if (blockSeen.match(action)) {
    const { payload }: { payload: AnyEVMBlock } = action
    return isListed(payload.network.chainID) ? action : undefined
  }

  if (networkReachabilityChanged.match(action)) {
    return isListed(action.payload.chainID) ? action : undefined
  }

  return action
}
