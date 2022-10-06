import { PriceDetails, SwapQuoteRequest, ZrxQuote } from "../0x-swap"

type OldState = {
  swap: {
    latestQuoteRequest?: SwapQuoteRequest | undefined
    finalQuote?: ZrxQuote | undefined
    inProgressApprovalContract?: string
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  swap: {
    latestQuoteRequest?: SwapQuoteRequest | undefined
    finalQuote?: ZrxQuote | undefined
    inProgressApprovalContract?: string
    priceDetails?: PriceDetails | undefined
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    swap: {
      ...typedPrevState.swap,
      priceDetails: undefined,
    },
  }
}
