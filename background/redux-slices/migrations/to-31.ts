type PrevState = {
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]: {
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
          [address: string]: {
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
      // Clear all accounts cached balances
      accountsData.evm[chainID][address].balances = {}
    })
  )

  return { ...typedPrevState }
}
