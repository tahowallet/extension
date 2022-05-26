// This migration transitions the by-address-keyed account data in the
// accounts slice to be keyed by account AND network chainID, as well as nested
// under an `evm` key.

import { ETHEREUM } from "../../constants"
import { EstimatedFeesPerGas } from "../transaction-construction"

type OldState = {
  transactionConstruction: {
    estimatedFeesPerGas: EstimatedFeesPerGas | unknown
    [others: string]: unknown
  }
}

type NewState = {
  transactionConstruction: NewTransactionConstructionState
}

type NewTransactionConstructionState = {
  estimatedFeesPerGas: {
    [chainId: string]: EstimatedFeesPerGas | unknown
  }
  [others: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  // Migrate the by-address-keyed account data in the accounts slice to be
  // keyed by account AND network chainID, as well as nested under an `evm`
  // key.

  const oldTransactionConstructionState = (prevState as OldState)
    .transactionConstruction

  const newTransactionConstructionState: NewTransactionConstructionState = {
    ...oldTransactionConstructionState,
    estimatedFeesPerGas: {
      [ETHEREUM.chainID]: oldTransactionConstructionState.estimatedFeesPerGas,
    },
  }

  return {
    ...prevState,
    transactionConstruction: newTransactionConstructionState,
  }
}
