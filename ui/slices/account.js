import { createSlice } from "@reduxjs/toolkit"
import { connectToBackgroundApi } from "@tallyho/tally-api/lib/connect"
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

export function subscribeToAccount() {
  return async (dispatch) => {
    dispatch(loadAccount())

    try {
      const address = await send({
        route: "/accounts/",
        method: "POST",
        params: {
          data: SEED_PHRASE_MM,
        },
      })

      console.log("address", address)
      console.log("here 1")

      subscribe(
        {
          route: `/accounts/${address}`,
          method: "GET",
        },
        (accountToMutate) => {
          console.log("here 2")

          // Temporarily fill in hard coded USD conversion
          if (account?.total_balance?.amount) {
            const usdAmount = (
              account?.total_balance?.amount * 2411.44
            ).toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
            account.total_balance.usd_amount = usdAmount
            account.tokens[0].usd_balance = usdAmount
          }
          dispatch(loadAccountSuccess(account))
        }
      )
    } catch (err) {
      console.error(err)
    }
  }
}
