import { createSlice } from "@reduxjs/toolkit"
import { createBackgroundAsyncThunk } from "./utils"
import { type GridPlusAddress } from "../services/grid-plus"

const MOCKED_ONBOARDING = process.env.MOCKED_GRID_PLUS_ONBOARDING === "true"

export type GridPlusState = {
  importableAddresses: string[]
  activeAddresses: GridPlusAddress[]
}

export const initialState: GridPlusState = {
  importableAddresses: [],
  activeAddresses: [],
}

const gridPlusSlice = createSlice({
  name: "grid-plus",
  initialState,
  reducers: {
    resetGridPlusState: (immerState) => {
      immerState.importableAddresses = []
      immerState.activeAddresses = []
    },
    setImportableAddresses: (
      immerState,
      { payload: importableAddresses }: { payload: string[] },
    ) => {
      immerState.importableAddresses = importableAddresses
    },
    setActiveAddresses: (
      immerState,
      { payload: activeAddresses }: { payload: GridPlusAddress[] },
    ) => {
      immerState.activeAddresses = activeAddresses
    },
  },
})

export const {
  resetGridPlusState,
  setImportableAddresses,
  setActiveAddresses,
} = gridPlusSlice.actions

export default gridPlusSlice.reducer

export const connectGridPlus = createBackgroundAsyncThunk(
  "grid-plus/connect",
  async (
    { deviceId, password }: { deviceId?: string; password?: string },
    { extra: { main } },
  ) => main.connectGridPlus({ deviceId, password }),
)

export const pairGridPlusDevice = createBackgroundAsyncThunk(
  "grid-plus/pairDevice",
  async ({ pairingCode }: { pairingCode: string }, { extra: { main } }) =>
    main.pairGridPlusDevice({ pairingCode }),
)

export const fetchGridPlusAddresses = createBackgroundAsyncThunk(
  "grid-plus/fetchAddresses",
  async (
    {
      n = 10,
      startPath = [0x80000000 + 44, 0x80000000 + 60, 0x80000000, 0, 0],
    }: { n?: number; startPath?: number[] },
    { dispatch, extra: { main } },
  ) => {
    if (MOCKED_ONBOARDING) {
      return dispatch(
        setImportableAddresses(["0xdfb2682febe6ea96682b1018702958980449b7db"]),
      )
    }
    return dispatch(
      setImportableAddresses(
        await main.fetchGridPlusAddresses({ n, startPath }),
      ),
    )
  },
)

export const importGridPlusAddresses = createBackgroundAsyncThunk(
  "grid-plus/importAddresses",
  async (
    { addresses }: { addresses: GridPlusAddress[] },
    { extra: { main } },
  ) => main.importGridPlusAddresses({ addresses }),
)

export const initializeActiveAddresses = createBackgroundAsyncThunk(
  "grid-plus/initializeActiveAddresses",
  async (_, { extra: { main }, dispatch }) => {
    const activeAddresses = await main.readActiveGridPlusAddresses()
    return dispatch(setActiveAddresses(activeAddresses))
  },
)
