import { createSlice } from "@reduxjs/toolkit"
import { Ability } from "../services/abilities"
import { HexString, NormalizedEVMAddress } from "../types"
import { setSnackbarMessage } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"

export type AbilityState = "open" | "closed" | "expired" | "deleted" | "all"

type AbilitiesState = {
  filters: {
    state: AbilityState
  }
  abilities: {
    [address: HexString]: {
      [uuid: string]: Ability
    }
  }
  hideDescription: boolean
}

const initialState: AbilitiesState = {
  filters: {
    state: "open",
  },
  abilities: {},
  hideDescription: false,
}

const abilitiesSlice = createSlice({
  name: "abilities",
  initialState,
  reducers: {
    addAbilities: (immerState, { payload }: { payload: Ability[] }) => {
      payload.forEach((ability) => {
        const { address } = ability
        if (!immerState.abilities[address]) {
          immerState.abilities[address] = {}
        }
        immerState.abilities[address][ability.abilityId] = ability
      })
    },
    deleteAbility: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      delete immerState.abilities[payload.address]?.[payload.abilityId]
    },
    markAbilityAsCompleted: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      immerState.abilities[payload.address][payload.abilityId].completed = true
    },
    markAbilityAsRemoved: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      immerState.abilities[payload.address][payload.abilityId].removedFromUi =
        true
    },
    toggleHideDescription: (immerState, { payload }: { payload: boolean }) => {
      immerState.hideDescription = payload
    },
    updateFiltersAbilityState: (
      immerState,
      { payload: state }: { payload: AbilityState }
    ) => {
      immerState.filters.state = state
    },
  },
})

export const {
  addAbilities,
  deleteAbility,
  markAbilityAsCompleted,
  markAbilityAsRemoved,
  toggleHideDescription,
  updateFiltersAbilityState,
} = abilitiesSlice.actions

export const completeAbility = createBackgroundAsyncThunk(
  "abilities/completeAbility",
  async (
    {
      address,
      abilityId,
    }: { address: NormalizedEVMAddress; abilityId: string },
    { dispatch, extra: { main } }
  ) => {
    await main.markAbilityAsCompleted(address, abilityId)
    dispatch(markAbilityAsCompleted({ address, abilityId }))
    dispatch(setSnackbarMessage("Marked as completed"))
  }
)

export const removeAbility = createBackgroundAsyncThunk(
  "abilities/removeAbility",
  async (
    {
      address,
      abilityId,
    }: { address: NormalizedEVMAddress; abilityId: string },
    { dispatch, extra: { main } }
  ) => {
    await main.markAbilityAsRemoved(address, abilityId)
    dispatch(markAbilityAsRemoved({ address, abilityId }))
    dispatch(setSnackbarMessage("Ability deleted"))
  }
)

export default abilitiesSlice.reducer
