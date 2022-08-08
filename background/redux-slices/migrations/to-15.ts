type OldState = {
  transactionConstruction: {
    status: unknown
    transactionRequest?: unknown
    signedTransaction?: unknown
    broadcastOnSign?: boolean
    transactionLikelyFails?: boolean
    estimatedFeesPerGas: unknown
    customFeesPerGas?: unknown
    lastGasEstimatesRefreshed: number
    feeTypeSelected: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  transactionConstruction: {
    status: unknown
    transactionRequest?: unknown
    signedTransaction?: unknown
    broadcastOnSign?: boolean
    transactionLikelyFails?: boolean
    ETHAddressLookupCache: Record<string, boolean>
    estimatedFeesPerGas: unknown
    customFeesPerGas?: unknown
    lastGasEstimatesRefreshed: number
    feeTypeSelected: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const { transactionConstruction, ...newState } = prevState as OldState

  return {
    ...newState,
    transactionConstruction: {
      ...transactionConstruction,
      ETHAddressLookupCache: {},
    },
  }
}
