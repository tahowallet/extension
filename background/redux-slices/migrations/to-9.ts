// This migration transitions the transaction construction slice's gas estimate
// structure to support custom gas estimates.

import { BlockEstimate } from "../../networks"

type OldState = {
  transactionConstruction: {
    estimatedFeesPerGas: {
      baseFeePerGas?: bigint
      instant?: BlockEstimate
      express?: BlockEstimate
      regular?: BlockEstimate
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  transactionConstruction: {
    estimatedFeesPerGas: {
      baseFeePerGas?: bigint
      instant?: BlockEstimate
      express?: BlockEstimate
      regular?: BlockEstimate
      custom: BlockEstimate
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  const newState = {
    ...prevState,
    transactionConstruction: {
      ...typedPrevState.transactionConstruction,
      estimatedFeesPerGas: {
        ...typedPrevState.transactionConstruction.estimatedFeesPerGas,
        custom: {
          maxFeePerGas: 1n,
          confidence: 0,
          maxPriorityFeePerGas: 1n,
        },
      },
    },
  }

  return newState
}
