// This migration ensures the keyrings slice with no keyringMetadata key has a
// keyringMetadata key whose default value is an empty object.

type OldState = {
  keyrings: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  keyrings: {
    keyringMetadata?: unknown
    [otherKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  const newState: NewState = {
    ...typedPrevState,
    keyrings: {
      ...typedPrevState.keyrings,
      keyringMetadata: {},
    },
  }

  newState.keyrings.keyringMetadata = {}

  return newState
}
