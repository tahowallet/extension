import { createSlice } from "@reduxjs/toolkit"
import { Ability, AbilityType } from "../abilities"
import { HexString, NormalizedEVMAddress } from "../types"
import { setSnackbarMessage } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"

export type AbilityState = "open" | "closed" | "expired" | "deleted" | "all"

export type FilterType = { type: AbilityType; isEnabled: boolean }

export type FilterAccount = {
  address: string
  isEnabled: boolean
  name?: string
  thumbnailURL?: string
}

export type AbilityFilter = {
  state: AbilityState
  types: FilterType[]
  accounts: FilterAccount[]
}

type AbilitiesState = {
  filters: AbilityFilter
  abilities: {
    [address: HexString]: {
      [uuid: string]: Ability
    }
  }
  hideDescription: boolean
}

const typesFilter: FilterType[] = [
  {
    type: "claim",
    isEnabled: true,
  },
  {
    type: "airdrop",
    isEnabled: true,
  },
  {
    type: "mint",
    isEnabled: true,
  },
]

const initialState: AbilitiesState = {
  filters: {
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
    updateFilterAbilityState: (
      immerState,
      { payload: state }: { payload: AbilityState }
    ) => {
      immerState.filters.state = state
    },
    updateFilterAbilityType: (
      immerState,
      { payload: filter }: { payload: FilterType }
    ) => {
      const idx = immerState.filters.types.findIndex(
        ({ type }) => type === filter.type
      )
      immerState.filters.types[idx] = filter
    },
    updateFilterAccount: (
      immerState,
      { payload: filter }: { payload: FilterAccount }
    ) => {
      const idx = immerState.filters.accounts.findIndex(
        ({ address }) => address === filter.address
      )
      immerState.filters.accounts[idx] = filter
    },
    addAccountFilter: (
      immerState,
      { payload: address }: { payload: string }
    ) => {
      const filter = immerState.filters.accounts.find(
        (account) => account.address === address
      )
      if (!filter) {
        immerState.filters.accounts.push({ address, isEnabled: true })
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
  updateFilterAbilityState,
  updateFilterAbilityType,
  updateFilterAccount,
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
