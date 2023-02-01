import { createSlice } from "@reduxjs/toolkit"
import { Ability } from "../services/abilities"
import { HexString, NormalizedEVMAddress } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

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
    updateAbility: (immerState, { payload }: { payload: Ability }) => {
      immerState.abilities[payload.address][payload.abilityId] = payload
    },
    deleteAbility: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      delete immerState.abilities[payload.address]?.[payload.abilityId]
    },
    toggleHideDescription: (immerState, { payload }: { payload: boolean }) => {
      immerState.hideDescription = payload
    },
  },
})

export const {
  addAbilities,
  updateAbility,
  deleteAbility,
  toggleHideDescription,
} = abilitiesSlice.actions

export const completeAbility = createBackgroundAsyncThunk(
  "abilities/completeAbility",
  async (
    {
      address,
      abilityId,
    }: { address: NormalizedEVMAddress; abilityId: string },
    { extra: { main } }
  ) => {
    await main.markAbilityAsCompleted(address, abilityId)
  }
)

export const removeAbility = createBackgroundAsyncThunk(
  "abilities/removeAbility",
  async (
    {
      address,
      abilityId,
    }: { address: NormalizedEVMAddress; abilityId: string },
    { extra: { main } }
  ) => {
    await main.markAbilityAsRemoved(address, abilityId)
  }
)

export const reportAndRemoveAbility = createBackgroundAsyncThunk(
  "abilities/reportAndRemoveAbility",
  async (
    {
      address,
      abilitySlug,
      abilityId,
      reason,
    }: {
      address: NormalizedEVMAddress
      abilitySlug: string
      abilityId: string
      reason: string
    },
    { extra: { main } }
  ) => {
    await main.reportAndRemoveAbility(address, abilitySlug, abilityId, reason)
  }
)

export default abilitiesSlice.reducer
