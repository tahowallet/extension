import { createSlice } from "@reduxjs/toolkit"
import { EVMTransaction, HexString } from "../types"

type TransactionParties = {
  from: HexString
  to: HexString
}

export const initialState: Partial<EVMTransaction> = {}

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    transactionParties: (
      immerState,
      { payload: parties }: { payload: TransactionParties }
    ) => {
      immerState.from = parties.from
      immerState.to = parties.to
    },

    transactionValue: (immerState, { payload: value }: { payload: bigint }) => {
      immerState.value = value
    },
  },
})

export const { transactionParties, transactionValue } = transactionSlice.actions

export default transactionSlice.reducer
