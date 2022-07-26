import { ETHEREUM } from "../../constants"

type OldState = {
  ledger: {
    [sliceKey: string]: unknown
    devices: {
      [devicesKey: string]: {
        accounts: {
          [accountKey: string]: {
            [accountData: string]: unknown
            balance: string | null
          }
        }
      }
    }
  }
  [otherSlice: string]: unknown
}
type NewState = {
  ledger: {
    [sliceKey: string]: unknown
    devices: {
      [devicesKey: string]: {
        accounts: {
          [accountKey: string]: {
            [accountData: string]: unknown
            balance: Record<string, string>
          }
        }
      }
    }
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    ledger: {
      ...typedPrevState.ledger,
      devices: Object.fromEntries(
        Object.entries(typedPrevState.ledger.devices).map(
          ([deviceKey, data]) => [
            deviceKey,
            {
              ...data,
              accounts: Object.fromEntries(
                Object.entries(data.accounts).map(
                  ([accountKey, accountData]) => [
                    accountKey,
                    {
                      ...accountData,
                      balance: accountData.balance
                        ? { [ETHEREUM.chainID]: accountData.balance }
                        : {},
                    },
                  ]
                )
              ),
            },
          ]
        )
      ),
    },
  }
}
