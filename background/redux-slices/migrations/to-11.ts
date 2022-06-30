type OldState = {
  ui: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  ui: {
    slippageTolerance: number
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    ui: {
      ...typedPrevState.ui,
      slippageTolerance: 0.01,
    },
  }
}
