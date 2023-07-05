type PrevState = {
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]:
            | "loading"
            | {
                balances: {
                  [symbol: string]: unknown
                }
                [other: string]: unknown
              }
        }
      }
    }
    [sliceKey: string]: unknown
  }
}

type NewState = {
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
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as PrevState

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

  return { ...typedPrevState }
}
