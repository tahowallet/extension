import { createSlice } from "@reduxjs/toolkit"
import { Ability } from "../services/abilities"

type AbilitiesState = {
  [uuid: string]: Ability
}

const initialState: AbilitiesState = {}

const abilitiesSlice = createSlice({
  name: "abilities",
  initialState,
  reducers: {
    setAbilities: (immerState, { payload }: { payload: Ability[] }) => {
      payload.forEach((ability) => {
        immerState[ability.uuid] = ability
      })
    },
    removeAbilities: (immerState, { payload }: { payload: string[] }) => {
      payload.forEach((abilityId) => {
        delete immerState[abilityId]
      })
    },
  },
})

export const { setAbilities, removeAbilities } = abilitiesSlice.actions

export default abilitiesSlice.reducer
