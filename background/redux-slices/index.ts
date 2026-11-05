import { AnyAction, combineReducers } from "redux"

import accountsReducer from "./accounts"
import addressBookReducer from "./address-book"
import assetsReducer from "./assets"
import activitiesReducer from "./activities"
import internalSignerReducer from "./internal-signer"
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
import nftsReducer from "./nfts"
import pricesReducer from "./prices"
import { withoutUnlistedChainWrites } from "./listed-chains"
// The history slice keeps no state, but it is imported here so that its
// background thunks are registered as aliases.
import "./history"

const mainReducer = combineReducers({
  account: accountsReducer,
  addressBook: addressBookReducer,
  assets: assetsReducer,
  activities: activitiesReducer,
  internalSigner: internalSignerReducer,
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
  nfts: nftsReducer,
  prices: pricesReducer,
})

export type RootState = ReturnType<typeof mainReducer>

/**
 * Reduces actions like the combined slice reducers do, except that writes for
 * chains missing from the network list are dropped first. See
 * {@link withoutUnlistedChainWrites} for why.
 */
const rootReducer = (
  state: RootState | undefined,
  action: AnyAction,
): RootState => {
  const listedAction = withoutUnlistedChainWrites(state, action)
  if (listedAction === undefined && state !== undefined) {
    return state
  }
  return mainReducer(state, listedAction ?? action)
}

export default rootReducer
