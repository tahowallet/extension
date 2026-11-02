import { useCallback, useMemo } from "react"
import { useHistory } from "react-router-dom"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  AccountTotal,
  selectAccountTotals,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectShowTestNetworks } from "@tallyho/tally-background/redux-slices/ui"
import { selectEVMNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import { TEST_NETWORK_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import {
  normalizeEVMAddress,
  sameEVMAddress,
} from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

/**
 * Returns a function that selects the given account and network, then
 * navigates to the given popup page with the given location state. This is
 * needed because popup pages such as send, swap and single asset act on the
 * currently selected account rather than taking one as a parameter.
 */
export function useOpenPageAs(): (
  addressOnNetwork: AddressOnNetwork,
  pathname: string,
  state?: unknown,
) => Promise<void> {
  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  return useCallback(
    async (addressOnNetwork, pathname, state) => {
      await dispatch(setNewSelectedAccount(addressOnNetwork))
      history.push({ pathname, state })
    },
    [dispatch, history],
  )
}

/** The path of an account's page in the full-tab view. */
export const accountPath = (address: string): string =>
  `/accounts/${normalizeEVMAddress(address)}`

/**
 * Returns the accounts in the wallet, with their names and avatars as
 * resolved on the current network.
 */
export function useFullTabAccounts(): AccountTotal[] {
  return useBackgroundSelector(selectAccountTotals)
}

export function useFullTabAccount(address: string): AccountTotal | undefined {
  const accounts = useFullTabAccounts()
  return useMemo(
    () => accounts.find((account) => sameEVMAddress(account.address, address)),
    [accounts, address],
  )
}

/**
 * The networks an account is tracked on, in the wallet's network order. Test
 * networks are included only if the user has enabled them.
 */
export function useAccountNetworks(address: string): EVMNetwork[] {
  const networks = useBackgroundSelector(selectEVMNetworks)
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  const accountsData = useBackgroundSelector(
    (state) => state.account.accountsData.evm,
  )
  const normalizedAddress = normalizeEVMAddress(address)

  return useMemo(
    () =>
      networks.filter(
        (network) =>
          (showTestNetworks ||
            !TEST_NETWORK_BY_CHAIN_ID.has(network.chainID)) &&
          accountsData[network.chainID]?.[normalizedAddress] !== undefined,
      ),
    [accountsData, networks, normalizedAddress, showTestNetworks],
  )
}
