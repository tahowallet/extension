type OldState = {
  ui: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  ui: {
    [sliceKey: string]: unknown
    showGlobalModal: boolean
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    ui: {
      ...typedPrevState.ui,
      showGlobalModal: true,
    },
  }
}
