import { combineReducers } from "redux"

import accountsReducer from "./accounts"
import assetsReducer from "./assets"
import activitiesReducer from "./activities"
import keyringsReducer from "./keyrings"
import networksReducer from "./networks"
import swapReducer from "./0x-swap"
import transactionConstructionReducer from "./transaction-construction"
import uiReducer from "./ui"
import dappPermissionReducer from "./dapp-permission"
import claimReducer from "./claim"
import ledgerReducer from "./ledger"
import signingReducer from "./signing"
import earnReducer from "./earn"

const mainReducer = combineReducers({
  account: accountsReducer,
  assets: assetsReducer,
  activities: activitiesReducer,
  keyrings: keyringsReducer,
  networks: networksReducer,
  swap: swapReducer,
  transactionConstruction: transactionConstructionReducer,
  ui: uiReducer,
  dappPermission: dappPermissionReducer,
  claim: claimReducer,
  signing: signingReducer,
  earn: earnReducer,
  ledger: ledgerReducer,
})

export default mainReducer

export type RootState = ReturnType<typeof mainReducer>
