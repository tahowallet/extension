type OldState = {
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]: unknown
        }
      }
    }
  }
  activities: {
    [address: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]: unknown
        }
      }
    }
  }
  activities: {
    [address: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState
  const { accountsData } = typedPrevState.account

  const knownAddresses = new Set(
    Object.keys(accountsData.evm).flatMap((chainId) =>
      Object.keys(accountsData.evm[chainId])
    )
  )

  const filteredActivities = Object.fromEntries(
    Object.entries(typedPrevState.activities).filter(([address]) =>
      knownAddresses.has(address)
    )
  )

  return {
    ...typedPrevState,
    activities: filteredActivities,
  }
}
