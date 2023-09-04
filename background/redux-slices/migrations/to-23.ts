import { POLYGON } from "../../constants"

type State = {
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]:
            | "loading"
            | {
                balances: {
                  [assetSymbol: string]: unknown
                }
              }
        }
      }
    }
  }
}
export default (oldState: Record<string, unknown>): State => {
  const prevState = oldState as State

  const { account } = prevState

  return {
    ...prevState,
    account: {
      ...account,
      accountsData: {
        evm: {
          ...account.accountsData.evm,
          [POLYGON.chainID]: Object.fromEntries(
            Object.entries(account.accountsData.evm[POLYGON.chainID] ?? {}).map(
              ([accountAddress, accountData]) => [
                accountAddress,
                typeof accountData === "string"
                  ? accountData
                  : {
                      ...accountData,
                      balances: Object.fromEntries(
                        Object.entries(accountData.balances ?? {}).filter(
                          ([symbol]) => symbol !== "ETH", // remove duplicate with WETH
                        ),
                      ),
                    },
              ],
            ),
          ),
        },
      },
    },
  }
}
