import { AnyAction, CombinedState, combineReducers, Reducer } from "redux"

import buildAccountReducer from "./account"
import uiReducer from "./ui"

import ChainService from "../services/chain/service"

export default function buildRootReducer(
  chainService: Promise<ChainService>
): Reducer<
  CombinedState<{
    account: ReturnType<ReturnType<typeof buildAccountReducer>>
    ui: ReturnType<typeof uiReducer>
  }>,
  AnyAction
> {
  return combineReducers({
    account: buildAccountReducer(chainService),
    ui: uiReducer,
  })
}
