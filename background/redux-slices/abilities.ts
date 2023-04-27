import { createSlice } from "@reduxjs/toolkit"
import { Ability, ABILITY_TYPES_ENABLED } from "../abilities"
import { HexString, NormalizedEVMAddress } from "../types"
import { InternalSignerState } from "./internal-signer"
import { LedgerState } from "./ledger"
import { createBackgroundAsyncThunk } from "./utils"

const isLedgerAccount = (
  ledger: LedgerState,
  address: NormalizedEVMAddress
): boolean =>
  Object.values(ledger.devices)
    .flatMap((device) =>
      Object.values(device.accounts).flatMap((account) => account.address ?? "")
    )
    .includes(address)

const isImportOrInternalAccount = (
  internalSigners: InternalSignerState,
  address: NormalizedEVMAddress
): boolean =>
  internalSigners.keyrings
    .flatMap(({ addresses }) => addresses)
    .includes(address)

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
        if (immerState.abilities[address][ability.abilityId]) {
          const existingAbility =
            immerState.abilities[address][ability.abilityId]
          immerState.abilities[address][ability.abilityId] = {
            ...ability,
            removedFromUi: existingAbility.removedFromUi,
          }
        } else {
          immerState.abilities[address][ability.abilityId] = ability
        }
      })
    },
    updateAbility: (immerState, { payload }: { payload: Ability }) => {
      immerState.abilities[payload.address][payload.abilityId] = payload
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
  updateAbility,
  deleteAbilitiesForAccount,
  deleteAbility,
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

export const initAbilities = createBackgroundAsyncThunk(
  "abilities/initAbilities",
  async (
    address: NormalizedEVMAddress,
    { dispatch, getState, extra: { main } }
  ) => {
    const { ledger, internalSigners, abilities } = getState() as {
      ledger: LedgerState
      internalSigners: InternalSignerState
      abilities: AbilitiesState
    }
    if (
      isImportOrInternalAccount(internalSigners, address) ||
      isLedgerAccount(ledger, address)
    ) {
      await main.pollForAbilities(address)
      // Accounts for filter should be enabled after the first initialization.
      // The state of the filters after each reload should not refresh.
      if (JSON.stringify(abilities) === JSON.stringify(initialState)) {
        dispatch(addAccount(address))
      }
    }
  }
)

export default abilitiesSlice.reducer
