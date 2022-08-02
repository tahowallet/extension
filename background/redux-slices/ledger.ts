import { createSlice } from "@reduxjs/toolkit"
import { EVMNetwork } from "../networks"
import { HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"
import { enrichAssetAmountWithDecimalValues } from "./utils/asset-utils"

export interface LedgerAccountState {
  path: string
  address: HexString | null
  fetchingAddress: boolean
  /** Balance by chainID */
  balance: Record<string, string>
  fetchingBalance: boolean
}

export type LedgerConnectionStatus = "available" | "busy" | "disconnected"

export interface LedgerDeviceState {
  /** First address derived from standard ETH derivation path, used as ID */
  id: string
  /** Accounts by path */
  accounts: Record<string, LedgerAccountState>
  status: LedgerConnectionStatus // FIXME: this should not be persisted
  isArbitraryDataSigningEnabled?: boolean
}

export type LedgerState = {
  currentDeviceID: string | null
  /** Devices by ID */
  devices: Record<string, LedgerDeviceState>
  usbDeviceCount: number
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
  connectLedger: {
    resolve: (address: string) => void
    reject: (error: Error) => void
  }
}

export const initialState: LedgerState = {
  currentDeviceID: null,
  devices: {},
  usbDeviceCount: 0,
}

const ledgerSlice = createSlice({
  name: "ledger",
  initialState,
  reducers: {
    resetLedgerState: (immerState) => {
      immerState.currentDeviceID = null
      Object.values(immerState.devices).forEach((device) => {
        device.status = "disconnected" // eslint-disable-line no-param-reassign
        Object.values(device.accounts).forEach((account) => {
          account.fetchingAddress = false // eslint-disable-line no-param-reassign
          account.fetchingBalance = false // eslint-disable-line no-param-reassign
        })
      })
    },
    addLedgerDevice: (
      immerState,
      { payload: deviceID }: { payload: string }
    ) => {
      /* FIXME: devices/accounts are kept in the state even if not tracked  */
      if (deviceID in immerState.devices) return
      immerState.devices[deviceID] = {
        id: deviceID,
        accounts: {},
        status: "available",
        isArbitraryDataSigningEnabled: false,
      }
    },
    setCurrentDevice: (
      immerState,
      { payload: deviceID }: { payload: string }
    ) => {
      if (!(deviceID in immerState.devices)) return
      immerState.currentDeviceID = deviceID
    },
    setDeviceConnectionStatus: (
      immerState,
      {
        payload: { deviceID, status, isArbitraryDataSigningEnabled },
      }: {
        payload: {
          deviceID: string
          status: LedgerConnectionStatus
          isArbitraryDataSigningEnabled: boolean
        }
      }
    ) => {
      if (
        immerState.currentDeviceID === deviceID &&
        status === "disconnected"
      ) {
        immerState.currentDeviceID = null
      }
      const device = immerState.devices[deviceID]
      if (!device) return
      device.status = status

      device.isArbitraryDataSigningEnabled = isArbitraryDataSigningEnabled
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
        balance: {},
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
        payload: { deviceID, path, balance, network },
      }: {
        payload: {
          deviceID: string
          path: string
          balance: string
          network: EVMNetwork
        }
      }
    ) => {
      const device = immerState.devices[deviceID]
      if (!device) return
      const account = device.accounts[path]
      if (!account) return
      account.balance[network.chainID] ??= balance
    },
    setUsbDeviceCount: (
      immerState,
      { payload: { usbDeviceCount } }: { payload: { usbDeviceCount: number } }
    ) => {
      immerState.usbDeviceCount = usbDeviceCount
    },
  },
})

export const {
  resetLedgerState,
  setDeviceConnectionStatus,
  addLedgerAccount,
  setUsbDeviceCount,
} = ledgerSlice.actions

export default ledgerSlice.reducer

export const connectLedger = createBackgroundAsyncThunk(
  "ledger/connectLedger",
  async (unused, { dispatch, extra: { main } }) => {
    const deviceID = await main.connectLedger()
    if (!deviceID) {
      return
    }

    dispatch(ledgerSlice.actions.addLedgerDevice(deviceID))
    dispatch(ledgerSlice.actions.setCurrentDevice(deviceID))
  }
)

export const fetchAddress = createBackgroundAsyncThunk(
  "ledger/fetchAddress",
  async (
    { deviceID, path }: { deviceID: string; path: string },
    { dispatch, extra: { main } }
  ) => {
    try {
      dispatch(ledgerSlice.actions.setFetchingAddress({ deviceID, path }))
      const address = await main.deriveLedgerAddress(deviceID, path) // FIXME: deviceID is ignored
      dispatch(ledgerSlice.actions.resolveAddress({ deviceID, path, address }))
    } catch (err) {
      dispatch(ledgerSlice.actions.resetLedgerState())
    }
  }
)

export const fetchBalance = createBackgroundAsyncThunk(
  "ledger/fetchBalance",
  async (
    {
      deviceID,
      path,
      address,
      network,
    }: { deviceID: string; path: string; address: string; network: EVMNetwork },
    { dispatch, extra: { main } }
  ) => {
    dispatch(ledgerSlice.actions.setFetchingBalance({ deviceID, path }))
    const amount = await main.getAccountEthBalanceUncached({
      address,
      network,
    })
    const decimalDigits = 3
    const balance = enrichAssetAmountWithDecimalValues(
      { amount, asset: network.baseAsset },
      decimalDigits
    ).localizedDecimalAmount
    dispatch(
      ledgerSlice.actions.resolveBalance({ deviceID, path, balance, network })
    )
  }
)

export const importLedgerAccounts = createBackgroundAsyncThunk(
  "ledger/importLedgerAccounts",
  async (
    {
      accounts,
    }: {
      accounts: Array<{ path: string; address: string }>
    },
    { extra: { main } }
  ) => {
    await main.importLedgerAccounts(accounts)
  }
)
