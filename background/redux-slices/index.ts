import { combineReducers } from "redux"

import accountsReducer from "./accounts"
import assetsReducer from "./assets"
import keyringsReducer from "./keyrings"
import transactionReducer from "./transaction"
import uiReducer from "./ui"

export default combineReducers({
  account: accountsReducer,
  assets: assetsReducer,
  keyrings: keyringsReducer,
  transaction: transactionReducer,
  ui: uiReducer,
})
