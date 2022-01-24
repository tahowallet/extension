import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { createBackgroundAsyncThunk } from "./utils"

export interface LedgerAccountState {
  path: string
  address: string | null
  fetchingAddress: boolean
  balance: string | null
  fetchingBalance: boolean
}

export type LedgerImportState = {
  /** Changes when a new ledger is connected */
  nonce: number
  connected: boolean
  parentPath: string | null
  accounts: LedgerAccountState[]
}

export type Events = {
  fetchAddress: {
    path: string
    resolve: (address: string) => void
    reject: (error: Error) => void
  }
  fetchBalance: {
    address: string
    resolve: (balance: string) => void
    reject: (error: Error) => void
  }
}

export const emitter = new Emittery<Events>()

export const initialState: LedgerImportState = {
  nonce: 0,
  connected: false,
  parentPath: null,
  accounts: [],
}

const ledgerImportSlice = createSlice({
  name: "ledger-import",
  initialState,
  reducers: {
    ledgerImportReset: (immerState) => {
      immerState.nonce += 1
      immerState.parentPath = null
      immerState.connected = false
      immerState.accounts = []
    },
    setLedgerConnected: (
      immerState,
      { payload: nonce }: { payload: number }
    ) => {
      if (immerState.nonce !== nonce) return
      immerState.connected = true
    },
    setPath: (immerState, { payload: path }: { payload: string }) => {
      immerState.parentPath = path
      immerState.accounts = []
    },
    resizeAccounts: (immerState, { payload: length }: { payload: number }) => {
      while (immerState.accounts.length > length) immerState.accounts.pop()
      for (let i = immerState.accounts.length; i < length; i += 1) {
        immerState.accounts.push({
          path: `${immerState.parentPath}/${i}`,
          address: null,
          fetchingAddress: false,
          balance: null,
          fetchingBalance: false,
        })
      }
    },
    setFetchingAddress: (
      immerState,
      {
        payload: { nonce, index, path },
      }: {
        payload: { nonce: number; index: number; path: string }
      }
    ) => {
      if (immerState.nonce !== nonce) return
      const account = immerState.accounts[index]
      if (!account) return
      if (account.path !== path) return
      account.fetchingAddress = true
    },
    setFetchingBalance: (
      immerState,
      {
        payload: { index, address },
      }: { payload: { index: number; address: string } }
    ) => {
      const account = immerState.accounts[index]
      if (!account) return
      if (account.address !== address) return
      account.fetchingBalance = true
    },
    resolveAddress: (
      immerState,
      {
        payload: { nonce, index, path, address },
      }: {
        payload: {
          nonce: number
          index: number
          path: string
          address: string
        }
      }
    ) => {
      if (immerState.nonce !== nonce) return
      const account = immerState.accounts[index]
      if (!account) return
      if (account.path !== path) return
      if (account.address === null) account.address = address
    },
    resolveBalance: (
      immerState,
      {
        payload: { index, address, balance },
      }: { payload: { index: number; address: string; balance: string } }
    ) => {
      const account = immerState.accounts[index]
      if (!account) return
      if (account.address !== address) return
      if (account.balance === null) account.balance = balance
    },
  },
})

export const { ledgerImportReset, setPath, resizeAccounts } =
  ledgerImportSlice.actions

export default ledgerImportSlice.reducer

async function doConnectFake() {
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
}

async function doFetchAddressReal(path: string) {
  // TODO: respond to this event to provide actual data
  return new Promise<string>((resolve, reject) => {
    emitter.emit("fetchAddress", { path, resolve, reject })
  })
}

async function doFetchAddressFake(path: string) {
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })

  return `0x${Array.from({ length: 20 }, () => {
    const byte = Math.floor(Math.random() * 256)
    const hex = `0${byte.toString(16)}`
    return hex.slice(hex.length - 2)
  }).join("")}`
}

async function doFetchBalanceReal(address: string) {
  // TODO: respond to this event to provide actual data
  return new Promise<string>((resolve, reject) => {
    emitter.emit("fetchBalance", { address, resolve, reject })
  })
}

async function doFetchBalanceFake(address: string) {
  await new Promise((resolve) => {
    setTimeout(resolve, 700)
  })

  return (10 ** (Math.random() * 5 - 2)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 4,
  })
}

export const connectLedger = createBackgroundAsyncThunk(
  "ledger-import/connectLedger",
  async ({ nonce }: { nonce: number }, { dispatch }) => {
    await doConnectFake()
    dispatch(ledgerImportSlice.actions.setLedgerConnected(nonce))
  }
)

export const fetchAddress = createBackgroundAsyncThunk(
  "ledger-import/fetchAddress",
  async (
    { nonce, index, path }: { nonce: number; index: number; path: string },
    { dispatch }
  ) => {
    dispatch(
      ledgerImportSlice.actions.setFetchingAddress({ nonce, index, path })
    )
    const address = await doFetchAddressFake(path)
    dispatch(
      ledgerImportSlice.actions.resolveAddress({ nonce, index, path, address })
    )
  }
)

export const fetchBalance = createBackgroundAsyncThunk(
  "ledger-import/fetchBalance",
  async (
    { index, address }: { index: number; address: string },
    { dispatch }
  ) => {
    dispatch(ledgerImportSlice.actions.setFetchingBalance({ index, address }))
    const balance = await doFetchBalanceFake(address)
    dispatch(
      ledgerImportSlice.actions.resolveBalance({ index, address, balance })
    )
  }
)
