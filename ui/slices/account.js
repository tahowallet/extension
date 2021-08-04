import { createSlice } from "@reduxjs/toolkit"
import { connectToBackgroundApi } from "@tallyho/tally-api"
import { SEED_PHRASE_MM } from "@tallyho/tally-api/temp-stubs/stub"

const { send, subscribe } = connectToBackgroundApi("ui")

export const initialState = {
  accountLoading: false,
  hasAccountError: false,
  account: undefined,
}

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    loadAccount: (state) => ({
      ...state,
      accountLoading: true,
    }),
    loadAccountSuccess: (state, { payload }) => ({
      ...state,
      account: payload,
      accountLoading: false,
    }),
    loadAccountFailure: (state) => ({
      ...state,
      accountLoading: false,
      hasAccountError: true,
    }),
  },
})

export const { loadAccount, loadAccountSuccess, loadAccountFailure } =
  accountSlice.actions
export const accountSelector = (state) => state.account
export default accountSlice.reducer

// Temporarily fill in hard coded USD conversion
function enrichWithUSDAmounts(account) {
  const updatedAccount = { ...account }
  if (updatedAccount?.total_balance?.amount) {
    const usdAmount = (
      updatedAccount?.total_balance?.amount * 2411.44
    ).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })
    updatedAccount.total_balance.usd_amount = usdAmount
    updatedAccount.tokens[0].usd_balance = usdAmount
  }

  return updatedAccount
}

async function getAccountAddressIfExists() {
  const account = await send({
    route: "/accounts/",
    method: "GET",
  })

  return account.address
}

async function createOrGetAddress() {
  const existingAddress = await getAccountAddressIfExists()
  let address
  if (!existingAddress) {
    address = await send({
      route: "/accounts/",
      method: "POST",
      params: {
        data: SEED_PHRASE_MM,
      },
    })
  } else {
    address = existingAddress
  }

  return address
}

export function subscribeToAccount() {
  return async (dispatch) => {
    dispatch(loadAccount())

    try {
      const address = await createOrGetAddress()
      subscribe(
        {
          route: `/accounts/${address}`,
          method: "GET",
        },
        (account) => {
          const updatedAccount = enrichWithUSDAmounts(account)
          dispatch(loadAccountSuccess(updatedAccount))
        }
      )
    } catch (err) {
      console.error(err)
    }
  }
}
