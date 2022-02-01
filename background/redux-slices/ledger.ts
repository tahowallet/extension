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

export interface LedgerDeviceState {
  /** First address derived from standard ETH derivation path, used as ID */
  id: string
  /** Accounts by path */
  accounts: Record<string, LedgerAccountState | undefined>
}

export type LedgerState = {
  /** Devices by ID */
  devices: Record<string, LedgerDeviceState | undefined>
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
  importLedgerAccounts: Array<{
    path: string
    address: string
  }>
}

export const emitter = new Emittery<Events>()

export const initialState: LedgerState = {
  devices: {},
}

const ledgerSlice = createSlice({
  name: "ledger",
  initialState,
  reducers: {
    ledgerReset: (immerState) => {
      immerState.devices = {}
    },
    addLedgerDevice: (
      immerState,
      { payload: deviceID }: { payload: string }
    ) => {
      if (deviceID in immerState.devices) return
      immerState.devices[deviceID] = {
        id: deviceID,
        accounts: {},
      }
    },
    addLedgerAccount: (
      immerState,
      {
        payload: { deviceID, path },
      }: { payload: { deviceID: string; path: string } }
    ) => {
      const device = immerState.devices[deviceID]
      if (!device) return
      if (path in device.accounts) return
      device.accounts[path] = {
        path,
        address: null,
        fetchingAddress: false,
        balance: null,
        fetchingBalance: false,
      }
    },
    setFetchingAddress: (
      immerState,
      {
        payload: { deviceID, path },
      }: {
        payload: { deviceID: string; path: string }
      }
    ) => {
      const device = immerState.devices[deviceID]
      if (!device) return
      const account = device.accounts[path]
      if (!account) return
      account.fetchingAddress = true
    },
    setFetchingBalance: (
      immerState,
      {
        payload: { deviceID, path },
      }: { payload: { deviceID: string; path: string } }
    ) => {
      const device = immerState.devices[deviceID]
      if (!device) return
      const account = device.accounts[path]
      if (!account) return
      account.fetchingBalance = true
    },
    resolveAddress: (
      immerState,
      {
        payload: { deviceID, path, address },
      }: {
        payload: { deviceID: string; path: string; address: string }
      }
    ) => {
      const device = immerState.devices[deviceID]
      if (!device) return
      const account = device.accounts[path]
      if (!account) return
      if (account.address === null) account.address = address
    },
    resolveBalance: (
      immerState,
      {
        payload: { deviceID, path, balance },
      }: { payload: { deviceID: string; path: string; balance: string } }
    ) => {
      const device = immerState.devices[deviceID]
      if (!device) return
      const account = device.accounts[path]
      if (!account) return
      if (account.balance === null) account.balance = balance
    },
  },
})

export const { ledgerReset, addLedgerAccount } = ledgerSlice.actions

export default ledgerSlice.reducer

let fakeDeviceNonce = 0

async function doConnectFake() {
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })

  fakeDeviceNonce += 1
  return `fake-device-id-${fakeDeviceNonce}`
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
  "ledger/connectLedger",
  async (unused, { dispatch }) => {
    const deviceID = await doConnectFake()
    dispatch(ledgerSlice.actions.addLedgerDevice(deviceID))
    return { deviceID }
  }
)

export const fetchAddress = createBackgroundAsyncThunk(
  "ledger/fetchAddress",
  async (
    { deviceID, path }: { deviceID: string; path: string },
    { dispatch }
  ) => {
    dispatch(ledgerSlice.actions.setFetchingAddress({ deviceID, path }))
    const address = await doFetchAddressFake(path)
    dispatch(ledgerSlice.actions.resolveAddress({ deviceID, path, address }))
  }
)

export const fetchBalance = createBackgroundAsyncThunk(
  "ledger/fetchBalance",
  async (
    {
      deviceID,
      path,
      address,
    }: { deviceID: string; path: string; address: string },
    { dispatch }
  ) => {
    dispatch(ledgerSlice.actions.setFetchingBalance({ deviceID, path }))
    const balance = await doFetchBalanceFake(address)
    dispatch(ledgerSlice.actions.resolveBalance({ deviceID, path, balance }))
  }
)

export const importLedgerAccounts = createBackgroundAsyncThunk(
  "ledger/importLedgerAccounts",
  async ({
    accounts,
  }: {
    accounts: Array<{ path: string; address: string }>
  }) => {
    // TODO: listen to this event
    emitter.emit("importLedgerAccounts", accounts)
  }
)
