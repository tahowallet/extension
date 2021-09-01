import { combineReducers } from "redux"

import accountsReducer from "./accounts"
import assetsReducer from "./assets"
import uiReducer from "./ui"

export default combineReducers({
  account: accountsReducer,
  assets: assetsReducer,
  ui: uiReducer,
})
