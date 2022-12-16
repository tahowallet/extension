import { createSlice } from "@reduxjs/toolkit"
import { Ability } from "../services/abilities"
import { HexString } from "../types"
import { setSnackbarMessage } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"

type AbilitiesState = {
  [address: HexString]: {
    [uuid: string]: Ability
  }
}

const initialState: AbilitiesState = {}

const abilitiesSlice = createSlice({
  name: "abilities",
  initialState,
  reducers: {
    addAbilities: (immerState, { payload }: { payload: Ability[] }) => {
      payload.forEach((ability) => {
        const { address } = ability
        if (!immerState[address]) {
          immerState[address] = {}
        }
        immerState[address][ability.abilityId] = ability
      })
    },
    removeAbility: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      delete immerState[payload.address]?.[payload.abilityId]
    },
    markAbilityAsCompleted: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      immerState[payload.address][payload.abilityId].completed = true
    },
    markAbilityAsRemoved: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      immerState[payload.address][payload.abilityId].removedFromUi = true
    },
  },
})

export const {
  addAbilities,
  removeAbility,
  markAbilityAsCompleted,
  markAbilityAsRemoved,
} = abilitiesSlice.actions

export const completeAbility = createBackgroundAsyncThunk(
  "abilities/completeAbility",
  async (
    { address, abilityId }: { address: HexString; abilityId: string },
    { dispatch, extra: { main } }
  ) => {
    await main.markAbilityAsCompleted(address, abilityId)
    dispatch(markAbilityAsCompleted({ address, abilityId }))
    dispatch(setSnackbarMessage("Marked as completed"))
  }
)

export const deleteAbilty = createBackgroundAsyncThunk(
  "abilities/deleteAbility",
  async (
    { address, abilityId }: { address: HexString; abilityId: string },
    { dispatch, extra: { main } }
  ) => {
    await main.markAbilityAsRemoved(address, abilityId)
    dispatch(markAbilityAsRemoved({ address, abilityId }))
    dispatch(setSnackbarMessage("Ability deleted"))
  }
)

export default abilitiesSlice.reducer
