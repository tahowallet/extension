import { createSlice } from "@reduxjs/toolkit"
import {
  Ability,
  AbilityType,
  ABILITY_TYPES,
  ABILITY_TYPES_ENABLED,
} from "../abilities"
import { HexString, NormalizedEVMAddress } from "../types"
import { setSnackbarMessage } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"
import { Account } from "./utils/account-filter-utils"

export type State = "open" | "completed" | "expired" | "deleted" | "all"

export type Type = { type: AbilityType; isEnabled: boolean }

export type AbilityFilter = {
  state: State
  types: Type[]
  accounts: Account[]
}

type AbilitiesState = {
  filter: AbilityFilter
  abilities: {
    [address: HexString]: {
      [uuid: string]: Ability
    }
  }
  hideDescription: boolean
}

const typesFilter: Type[] = ABILITY_TYPES.map((type) => ({
  type,
  isEnabled: !!ABILITY_TYPES_ENABLED.find(
    (enabledType) => enabledType === type
  ),
}))

const initialState: AbilitiesState = {
  filter: {
    state: "open",
    types: typesFilter,
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
    updateType: (immerState, { payload: filter }: { payload: Type }) => {
      const idx = immerState.filter.types.findIndex(
        ({ type }) => type === filter.type
      )
      immerState.filter.types[idx] = filter
    },
    updateAccount: (immerState, { payload: filter }: { payload: Account }) => {
      const idx = immerState.filter.accounts.findIndex(
        ({ id }) => id === filter.id
      )
      immerState.filter.accounts[idx] = filter
    },
    addAccountFilter: (
      immerState,
      { payload: address }: { payload: string }
    ) => {
      const filter = immerState.filter.accounts.find(
        (account) => account.id === address
      )
      if (!filter) {
        immerState.filter.accounts.push({
          id: address,
          name: "",
          isEnabled: true,
        })
      }
    },
  },
})

export const {
  addAbilities,
  deleteAbility,
  markAbilityAsCompleted,
  markAbilityAsRemoved,
  toggleHideDescription,
  updateState,
  updateType,
  updateAccount,
  addAccountFilter,
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
