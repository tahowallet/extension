type OldState = {
  ui: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  ui: {
    displayCurrency: {
      code: string
      rate: { amount: bigint; decimals: bigint }
    }
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...typedPrevState,
    ui: {
      ...typedPrevState.ui,
      displayCurrency: {
        code: "USD",
        rate: { amount: 1_000_000_000_0n, decimals: 10n },
      },
    },
  }
}
