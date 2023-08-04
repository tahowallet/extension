type OldState = {
  assets: unknown[]
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]:
            | "loading"
            | {
                balances: {
                  [assetID: string]: unknown
                }
                [other: string]: unknown
              }
        }
      }
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  assets: unknown[]
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]:
            | "loading"
            | {
                balances: {
                  [assetID: string]: unknown
                }
                [other: string]: unknown
              }
        }
      }
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  const {
    account: { accountsData },
  } = typedPrevState

  Object.keys(accountsData.evm).forEach((chainID) =>
    Object.keys(accountsData.evm[chainID]).forEach((address) => {
      const account = accountsData.evm[chainID][address]

      if (account !== "loading") {
        // Clear all accounts cached balances
        account.balances = {}
      }
    })
  )

  return {
    ...typedPrevState,
    assets: [],
  }
}
