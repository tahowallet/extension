import { combineReducers } from "redux"

import accountReducer from "./account"
import uiReducer from "./ui"

export default combineReducers({
  account: accountReducer,
  ui: uiReducer,
})
