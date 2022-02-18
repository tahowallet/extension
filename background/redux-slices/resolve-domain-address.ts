import { createSlice } from "@reduxjs/toolkit"
import { NameOnNetwork } from "../accounts"
import { createBackgroundAsyncThunk } from "./utils"

export type ResolvedDomainAddressState = {
  address: string
}

export const initialState: ResolvedDomainAddressState = {
  address: "",
}

const resolveDomainAddressSlice = createSlice({
  name: "resolveDomainAddress",
  initialState,
  reducers: {
    setResolvedAddress: (
      immerState,
      { payload: resolvedAddress }: { payload: string }
    ) => {
      immerState.address = resolvedAddress
    },
  },
})

export const { setResolvedAddress } = resolveDomainAddressSlice.actions

export default resolveDomainAddressSlice.reducer

export const resolveDomainAddress = createBackgroundAsyncThunk(
  "domain/resolveDomainAddress",
  async (nameNetwork: NameOnNetwork, { dispatch, extra: { main } }) => {
    const address = await main.resolveDomainAddress(nameNetwork)
    if (address) {
      dispatch(resolveDomainAddressSlice.actions.setResolvedAddress(address))
    }
  }
)
