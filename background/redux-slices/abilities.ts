import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { Ability, ABILITY_TYPES_ENABLED } from "../abilities"
import { HexString, NormalizedEVMAddress } from "../types"
import { setSnackbarMessage } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"

export type Events = {
  reportSpam: {
    address: NormalizedEVMAddress
    abilitySlug: string
    reason: string
  }
}

export const emitter = new Emittery<Events>()

export type State = "open" | "completed" | "expired" | "deleted" | "all"

export type Filter = {
  state: State
  types: string[]
  accounts: string[]
}

type AbilitiesState = {
  filter: Filter
  abilities: {
    [address: HexString]: {
      [uuid: string]: Ability
    }
  }
  hideDescription: boolean
}

const initialState: AbilitiesState = {
  filter: {
    state: "open",
    types: [...ABILITY_TYPES_ENABLED],
    accounts: [],
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
    deleteAbilitiesForAccount: (
      immerState,
      { payload: address }: { payload: HexString }
    ) => {
      delete immerState.abilities[address]
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
    updateState: (immerState, { payload: state }: { payload: State }) => {
      immerState.filter.state = state
    },
    addType: (immerState, { payload: type }: { payload: string }) => {
      immerState.filter.types.push(type)
    },
    deleteType: (immerState, { payload: type }: { payload: string }) => {
      immerState.filter.types = immerState.filter.types.filter(
        (value) => value !== type
      )
    },
    addAccount: (immerState, { payload: account }: { payload: string }) => {
      if (!immerState.filter.accounts.includes(account)) {
        immerState.filter.accounts.push(account)
      }
    },
    deleteAccount: (immerState, { payload: account }: { payload: string }) => {
      immerState.filter.accounts = immerState.filter.accounts.filter(
        (value) => value !== account
      )
    },
  },
})

export const {
  addAbilities,
  deleteAbilitiesForAccount,
  deleteAbility,
  markAbilityAsCompleted,
  markAbilityAsRemoved,
  toggleHideDescription,
  updateState,
  addType,
  deleteType,
  addAccount,
  deleteAccount,
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
  async (
    payload: {
      address: NormalizedEVMAddress
      abilityId: string
      abilitySlug: string
      reason: string
    },
    { dispatch }
  ) => {
    await emitter.emit("reportSpam", payload)
    dispatch(removeAbility(payload))
  }
)

export default abilitiesSlice.reducer
