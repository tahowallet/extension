import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { createBackgroundAsyncThunk } from "./utils"
import type {
  SparkAccount,
  SparkActivityItem,
  SparkBalance,
  SparkLightningInvoice,
  SparkSendRequest,
  SparkSendResult,
} from "../services/spark/types"
import type { SparkNetworkType } from "../networks"

export type SparkWalletStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export type SparkState = {
  accounts: { [accountID: string]: SparkAccount }
  balances: { [accountID: string]: SparkBalance }
  activity: { [accountID: string]: SparkActivityItem[] }
  walletStatus: {
    [accountID: string]: { status: SparkWalletStatus; error?: string }
  }
}

export const initialState: SparkState = {
  accounts: {},
  balances: {},
  activity: {},
  walletStatus: {},
}

/**
 * Result shape for Spark thunks the UI awaits. Errors are returned rather
 * than thrown so the popup can show the reason (thunk rejections do not
 * survive the background/UI proxy with their message intact).
 */
export type SparkResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

async function asSparkResult<T>(
  call: () => Promise<T>,
): Promise<SparkResult<T>> {
  try {
    return { ok: true, value: await call() }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const sparkSlice = createSlice({
  name: "spark",
  initialState,
  reducers: {
    sparkAccountsUpdated: (
      state,
      { payload }: PayloadAction<SparkAccount[]>,
    ) => {
      const accounts = Object.fromEntries(payload.map((a) => [a.id, a]))
      const keep = <T>(map: { [id: string]: T }) =>
        Object.fromEntries(Object.entries(map).filter(([id]) => id in accounts))

      return {
        ...state,
        accounts,
        balances: keep(state.balances),
        activity: keep(state.activity),
        walletStatus: keep(state.walletStatus),
      }
    },
    sparkBalanceUpdated: (state, { payload }: PayloadAction<SparkBalance>) => {
      if (payload.accountID in state.accounts) {
        state.balances[payload.accountID] = payload
      }
    },
    sparkActivityUpdated: (
      state,
      {
        payload: { accountID, items },
      }: PayloadAction<{ accountID: string; items: SparkActivityItem[] }>,
    ) => {
      if (accountID in state.accounts) {
        state.activity[accountID] = items
      }
    },
    sparkWalletStatusUpdated: (
      state,
      {
        payload: { accountID, status, error },
      }: PayloadAction<{
        accountID: string
        status: SparkWalletStatus
        error?: string
      }>,
    ) => {
      if (accountID in state.accounts) {
        state.walletStatus[accountID] = { status, error }
      }
    },
  },
})

export const {
  sparkAccountsUpdated,
  sparkBalanceUpdated,
  sparkActivityUpdated,
  sparkWalletStatusUpdated,
} = sparkSlice.actions

export default sparkSlice.reducer

export const addSparkAccount = createBackgroundAsyncThunk(
  "spark/addAccount",
  async (
    params: { networkType: SparkNetworkType; keyringID?: string },
    { extra: { main } },
  ): Promise<SparkResult<SparkAccount>> =>
    asSparkResult(() => main.addSparkAccount(params)),
)

export const removeSparkAccount = createBackgroundAsyncThunk(
  "spark/removeAccount",
  async (accountID: string, { extra: { main } }): Promise<SparkResult<null>> =>
    asSparkResult(async () => {
      await main.removeSparkAccount(accountID)
      return null
    }),
)

export const refreshSparkAccount = createBackgroundAsyncThunk(
  "spark/refreshAccount",
  async (accountID: string, { extra: { main } }): Promise<SparkResult<null>> =>
    asSparkResult(async () => {
      await main.refreshSparkAccount(accountID)
      return null
    }),
)

export const getSparkDepositAddress = createBackgroundAsyncThunk(
  "spark/getDepositAddress",
  async (
    accountID: string,
    { extra: { main } },
  ): Promise<SparkResult<string>> =>
    asSparkResult(() => main.getSparkDepositAddress(accountID)),
)

export const createSparkLightningInvoice = createBackgroundAsyncThunk(
  "spark/createLightningInvoice",
  async (
    {
      accountID,
      amountSats,
      memo,
    }: { accountID: string; amountSats: number; memo?: string },
    { extra: { main } },
  ): Promise<SparkResult<SparkLightningInvoice>> =>
    asSparkResult(() =>
      main.createSparkLightningInvoice(accountID, amountSats, memo),
    ),
)

export const estimateSparkLightningFee = createBackgroundAsyncThunk(
  "spark/estimateLightningFee",
  async (
    {
      accountID,
      invoice,
      amountSats,
    }: { accountID: string; invoice: string; amountSats?: number },
    { extra: { main } },
  ): Promise<SparkResult<number>> =>
    asSparkResult(() =>
      main.estimateSparkLightningFee(accountID, invoice, amountSats),
    ),
)

export const sendSpark = createBackgroundAsyncThunk(
  "spark/send",
  async (
    request: SparkSendRequest,
    { extra: { main } },
  ): Promise<SparkResult<SparkSendResult>> =>
    asSparkResult(() => main.sendSpark(request)),
)
