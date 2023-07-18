type OldState = {
  assets: unknown[]
  [otherSlice: string]: unknown
}

type NewState = {
  assets: unknown[]
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...typedPrevState,
    assets: [],
  }
}
