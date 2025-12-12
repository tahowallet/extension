type PriceDetails = {
  priceImpact?: number
  buyCurrencyAmount?: string
  sellCurrencyAmount?: string
}

type OldState = {
  swap: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  swap: {
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
