import { combineReducers } from "redux"

import accountsReducer from "./accounts"
import assetsReducer from "./assets"
import activitiesReducer from "./activities"
import keyringsReducer from "./keyrings"
import networksReducer from "./networks"
import swapReducer from "./0x-swap"
import abilitiesReducer from "./abilities"
import transactionConstructionReducer from "./transaction-construction"
import uiReducer from "./ui"
import dappReducer from "./dapp"
import claimReducer from "./claim"
import ledgerReducer from "./ledger"
import signingReducer from "./signing"
import earnReducer from "./earn"
import nftsUpdateReducer from "./nfts_update"

const mainReducer = combineReducers({
  account: accountsReducer,
  assets: assetsReducer,
  activities: activitiesReducer,
  keyrings: keyringsReducer,
  networks: networksReducer,
  swap: swapReducer,
  transactionConstruction: transactionConstructionReducer,
  ui: uiReducer,
  dapp: dappReducer,
  claim: claimReducer,
  signing: signingReducer,
  earn: earnReducer,
  ledger: ledgerReducer,
  abilities: abilitiesReducer,
  nftsUpdate: nftsUpdateReducer,
})

export default mainReducer

export type RootState = ReturnType<typeof mainReducer>
