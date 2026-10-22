type OldBalance = {
  assetAmount: { amount: unknown; asset: unknown }
  address: unknown
  network: unknown
  blockHeight?: unknown
  retrievedAt: unknown
  dataSource: unknown
}

type OldState = {
  assets: unknown[]
  account: {
    combinedData?: unknown
    accountsData?: {
      evm: {
        [chainID: string]: {
          [address: string]:
            | "loading"
            | {
                balances: { [assetID: string]: OldBalance }
                [other: string]: unknown
              }
        }
      }
    }
    [key: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewBalance = {
  amount: unknown
  blockHeight?: unknown
  retrievedAt: unknown
  dataSource: unknown
}

type NewState = {
  assets: { ids: string[]; entities: Record<string, unknown> }
  account: {
    accountsData?: {
      evm: {
        [chainID: string]: {
          [address: string]:
            | "loading"
            | {
                balances: { [assetID: string]: NewBalance }
                [other: string]: unknown
              }
        }
      }
    }
    [key: string]: unknown
  }
  [otherSlice: string]: unknown
}

/**
 * Migrates:
 * 1. Assets slice from a flat array to entity adapter shape ({ ids, entities }).
 * 2. Removes the now-selector-computed combinedData from the account slice.
 * 3. Normalizes account balances from full AccountBalance objects (with
 *    embedded asset/network/address) to slim NormalizedBalance (amount +
 *    scalar fields only).
 *
 * Assets and balances are re-fetched on startup, so resetting assets to empty
 * is safe. Balances are migrated in-place so cached values survive the restart.
 */
export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  const { combinedData: _, ...accountWithoutCombinedData } =
    typedPrevState.account

  // Normalize persisted balances: strip embedded asset, network, and address.
  const evm = accountWithoutCombinedData.accountsData?.evm
  if (evm) {
    Object.values(evm).forEach((chainAccounts) => {
      Object.values(chainAccounts).forEach((accountData) => {
        if (accountData === "loading") return

        const newBalances: Record<string, unknown> = {}
        Object.entries(accountData.balances).forEach(
          ([assetID, oldBalance]) => {
            newBalances[assetID] = {
              amount: oldBalance.assetAmount?.amount ?? 0,
              blockHeight: oldBalance.blockHeight,
              retrievedAt: oldBalance.retrievedAt,
              dataSource: oldBalance.dataSource,
            }
          },
        )
        // eslint-disable-next-line no-param-reassign
        ;(accountData as Record<string, unknown>).balances = newBalances
      })
    })
  }

  return {
    ...typedPrevState,
    assets: { ids: [], entities: {} },
    account: accountWithoutCombinedData,
  } as unknown as NewState
}
