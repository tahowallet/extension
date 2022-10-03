import { createSlice } from "@reduxjs/toolkit"
import { EVMNetwork } from "../networks"
import { SyncedDevice, URRequest } from "../services/qr-hardware"
import { HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"
import { enrichAssetAmountWithDecimalValues } from "./utils/asset-utils"

export interface QRAccountState {
  path: string
  address: HexString | null
  fetchingAddress: boolean
  balance: Record<string, string>
  fetchingBalance: boolean
}

export interface QRHardwareState {
  id: string
  parentPath: string
  accounts: Record<string, QRAccountState>
}

export type QRHardwaresState = {
  currentDeviceID: string | null
  devices: Record<string, QRHardwareState>
  signing: URRequest | null
}

export const initialState: QRHardwaresState = {
  currentDeviceID: null,
  devices: {},
  signing: null,
}

const qrHardwareSlice = createSlice({
  name: "qrHardware",
  initialState,
  reducers: {
    resetState: (
      immerState,
      { payload: resetCurrentDeviceID }: { payload: boolean }
    ) => {
      if (resetCurrentDeviceID) {
        immerState.currentDeviceID = null
      }
      Object.values(immerState.devices).forEach((device) => {
        Object.values(device.accounts).forEach((account) => {
          account.fetchingAddress = false // eslint-disable-line no-param-reassign
          account.fetchingBalance = false // eslint-disable-line no-param-reassign
        })
      })
    },
    addQRDevice: (
      immerState,
      { payload: syncedDevice }: { payload: SyncedDevice }
    ) => {
      if (syncedDevice.id in immerState.devices) return
      immerState.devices[syncedDevice.id] = {
        id: syncedDevice.id,
        parentPath: `${
          syncedDevice.keyring.hdPath
        }/${syncedDevice.keyring.childrenPath.replace("*", "x")}`,
        accounts: {},
      }
    },
    setCurrentDevice: (
      immerState,
      { payload: deviceID }: { payload: string }
    ) => {
      if (!(deviceID in immerState.devices)) return
      immerState.currentDeviceID = deviceID
    },
    addQRDeviceAccount: (
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
    setQRSigning: (
      immerState,
      {
        payload: { id, ur },
      }: {
        payload: URRequest
      }
    ) => {
      immerState.signing = { id, ur }
    },
    resolvedQRSignature: (immerState) => {
      immerState.signing = null
    },
  },
})

export const { resetState, addQRDevice, addQRDeviceAccount, setQRSigning } =
  qrHardwareSlice.actions

export default qrHardwareSlice.reducer

export const syncQRKeyring = createBackgroundAsyncThunk(
  "qrHardware/syncQRKeyring",
  async (
    { type, cbor }: { type: string; cbor: string },
    { dispatch, extra: { main } }
  ) => {
    const device: SyncedDevice = await main.syncQRKeyring({ type, cbor })
    dispatch(qrHardwareSlice.actions.addQRDevice(device))
    dispatch(qrHardwareSlice.actions.setCurrentDevice(device.id))
  }
)

export const fetchAddress = createBackgroundAsyncThunk(
  "qrHardware/fetchAddress",
  async (
    { deviceID, path }: { deviceID: string; path: string },
    { dispatch, extra: { main } }
  ) => {
    try {
      dispatch(qrHardwareSlice.actions.setFetchingAddress({ deviceID, path }))
      const address = await main.deriveQRHardwareAddress(deviceID, path)
      dispatch(
        qrHardwareSlice.actions.resolveAddress({ deviceID, path, address })
      )
    } catch (err) {
      dispatch(qrHardwareSlice.actions.resetState(true))
    }
  }
)

export const fetchBalance = createBackgroundAsyncThunk(
  "qrHardware/fetchBalance",
  async (
    {
      deviceID,
      path,
      address,
      network,
    }: { deviceID: string; path: string; address: string; network: EVMNetwork },
    { dispatch, extra: { main } }
  ) => {
    dispatch(qrHardwareSlice.actions.setFetchingBalance({ deviceID, path }))
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
      qrHardwareSlice.actions.resolveBalance({
        deviceID,
        path,
        balance,
        network,
      })
    )
  }
)

export const importQRHardwareAccounts = createBackgroundAsyncThunk(
  "qrHardware/importQRHardwareAccounts",
  async (
    {
      accounts,
    }: {
      accounts: Array<{ path: string; address: string }>
    },
    { extra: { main } }
  ) => {
    await main.importQRHardwareAccounts(accounts)
  }
)

export const resolveQRSignature = createBackgroundAsyncThunk(
  "qrHardware/resolveQRSignature",
  async (requestUR: URRequest, { dispatch, extra: { main } }) => {
    await main.resolveQRSignature(requestUR)
    dispatch(qrHardwareSlice.actions.resolvedQRSignature())
  }
)
