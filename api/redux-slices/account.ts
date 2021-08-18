import { createSlice } from "@reduxjs/toolkit"
import { Dispatch } from "redux"
import { apiStubs } from "../temp-stubs"
import { SEED_PHRASE_MM, accountsResult } from "../temp-stubs/stub"

export const initialState: {
  accountLoading: boolean
  hasAccountError: boolean
  account: typeof accountsResult | undefined
} = {
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

export default accountSlice.reducer

// Temporarily fill in hard coded USD conversion
function enrichWithUSDAmounts(account: any) {
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
  const account = await apiStubs["/accounts/"].GET({ address: "" })

  return account.address
}

async function createOrGetAddress() {
  const existingAddress = await getAccountAddressIfExists()
  let address
  if (!existingAddress) {
    address = await apiStubs["/accounts/"].POST({
      data: SEED_PHRASE_MM,
    })
  } else {
    address = existingAddress
  }

  return address
}

export async function subscribeToAccount(
  dispatch: Dispatch<ReturnType<typeof loadAccount>>
): Promise<void> {
  dispatch(loadAccount())

  function accountUpdated(account: typeof accountsResult) {
    const updatedAccount = enrichWithUSDAmounts(account)
    dispatch(loadAccountSuccess(updatedAccount))
  }

  try {
    const address = await createOrGetAddress()
    const account = await apiStubs["/accounts/"].GET({ address })

    accountUpdated(account)
    apiStubs["/accounts/"].subscribe(accountUpdated)
  } catch (err) {
    console.error(err)
  }
}
