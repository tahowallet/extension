import { combineReducers } from "redux"

import accountReducer from "./account"
import assetsReducer from "./assets"
import uiReducer from "./ui"

export default combineReducers({
  account: accountReducer,
  assets: assetsReducer,
  ui: uiReducer,
})
