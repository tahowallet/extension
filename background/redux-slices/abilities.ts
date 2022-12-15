import { createSlice } from "@reduxjs/toolkit"
import { Ability } from "../services/abilities"
import { HexString } from "../types"

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
    addAbilitiesForAddress: (
      immerState,
      { payload }: { payload: { address: HexString; abilities: Ability[] } }
    ) => {
      const { address, abilities } = payload
      if (!immerState[address]) {
        immerState[address] = {}
      }

      abilities.forEach((ability) => {
        immerState[address][ability.uuid] = ability
      })
    },
    removeAbility: (
      immerState,
      { payload }: { payload: { address: HexString; abilityId: string } }
    ) => {
      delete immerState[payload.address]?.[payload.abilityId]
    },
  },
})

export const { addAbilitiesForAddress, removeAbility } = abilitiesSlice.actions

export default abilitiesSlice.reducer
