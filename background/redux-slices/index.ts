import { combineReducers } from "redux"

import accountsReducer from "./accounts"
import assetsReducer from "./assets"
import keyringsReducer from "./keyrings"
import transactionConstructionReducer from "./transaction-construction"
import uiReducer from "./ui"

export default combineReducers({
  account: accountsReducer,
  assets: assetsReducer,
  keyrings: keyringsReducer,
  transactionConstruction: transactionConstructionReducer,
  ui: uiReducer,
})
