import { combineReducers } from "redux"

import accountsReducer from "./accounts"
import assetsReducer from "./assets"
import keyringsReducer from "./keyrings"
import uiReducer from "./ui"

export default combineReducers({
  account: accountsReducer,
  assets: assetsReducer,
  keyrings: keyringsReducer,
  ui: uiReducer,
})
