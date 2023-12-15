import { DomainName, URI } from "../../types"

type OldState = {
  assets: unknown[]
  account: {
    accountsData: {
      evm: {
        [chainID: string]: {
          [address: string]:
            | "loading"
            | {
                ens: {
                  name?: DomainName
                  avatarURL?: URI
                  avatarType?: string
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
                ens: {
                  name?: DomainName
                  avatarURL?: URI
                  avatarType?: string
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
    Object.keys(accountsData.evm[chainID]).forEach(async (address) => {
      const account = accountsData.evm[chainID][address]

      if (account !== "loading") {
        const accountData = account.ens
        const { avatarURL } = accountData

        if (!avatarURL) {
          accountData.avatarType = undefined
        } else {
          const fileTypeResponse = await fetch(avatarURL, { method: "HEAD" })
          const avatarType = fileTypeResponse.headers.get("Content-Type")

          accountData.avatarType = avatarType ?? undefined
        }
      }
    }),
  )

  return {
    ...typedPrevState,
    assets: [],
  }
}
