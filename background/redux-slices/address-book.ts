import { createSlice } from "@reduxjs/toolkit"
import type { AddressOnNetwork } from "../accounts"
import type { AddressBookEntry } from "../services/name/db"
import type { AddressBookUpdateResult } from "../services/name"
import { createBackgroundAsyncThunk } from "./utils"

export type { AddressBookEntry, AddressBookUpdateResult }

export type AddressBookState = {
  /**
   * Every saved entry, each on the network it was saved on. The NameService is
   * the source of truth; this mirrors it for the UI.
   */
  entries: AddressBookEntry[]
}

export const initialState: AddressBookState = {
  entries: [],
}

const addressBookSlice = createSlice({
  name: "addressBook",
  initialState,
  reducers: {
    setAddressBook: (
      immerState,
      { payload: entries }: { payload: AddressBookEntry[] },
    ) => {
      immerState.entries = entries
    },
  },
})

export const { setAddressBook } = addressBookSlice.actions

export default addressBookSlice.reducer

/**
 * Saves a name for an address on a network. The dispatch promise resolves to
 * whether the name was saved and, if not, why.
 */
export const saveAddressBookEntry = createBackgroundAsyncThunk(
  "addressBook/saveEntry",
  async (
    payload: AddressOnNetwork & { name: string },
    { extra: { main } },
  ): Promise<AddressBookUpdateResult> => main.addOrEditAddressName(payload),
)

export const removeAddressBookEntry = createBackgroundAsyncThunk(
  "addressBook/removeEntry",
  async (payload: AddressOnNetwork, { extra: { main } }) => {
    await main.removeAddressName(payload)
  },
)
