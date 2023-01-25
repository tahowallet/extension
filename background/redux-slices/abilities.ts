import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { Ability } from "../services/abilities"
import { HexString, NormalizedEVMAddress } from "../types"
import { setSnackbarMessage } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"

export type Events = {
  reportAndRemoveAbility: {
    address: NormalizedEVMAddress
    abilitySlug: string
    abilityId: string
    reason: string
  }
}

export const emitter = new Emittery<Events>()

type AbilitiesState = {
  filter: "all" | "completed" | "incomplete"
  abilities: {
    [address: HexString]: {
      [uuid: string]: Ability
    }
  }
  hideDescription: boolean
}

const initialState: AbilitiesState = {
  filter: "incomplete",
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
  },
})

export const {
  addAbilities,
  deleteAbility,
  markAbilityAsCompleted,
  markAbilityAsRemoved,
  toggleHideDescription,
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

export const reportAndRemoveAbility = createBackgroundAsyncThunk(
  "abilities/reportAndRemoveAbility",
  async (payload: {
    address: NormalizedEVMAddress
    abilitySlug: string
    abilityId: string
    reason: string
  }) => {
    await emitter.emit("reportAndRemoveAbility", payload)
  }
)

export default abilitiesSlice.reducer
